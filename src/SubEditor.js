import { useAutoCallback, useAutoMemo } from 'hooks.macro'
import EditorContext from './EditorContext'
import { useContext } from 'react'
import deepSet from './deepSet'
import * as util from './util'
import access from './access'
import typeOf from './typeOf'
import React from 'react'

export default function SubEditor({
  onChange,
  schemaKeyChain,
  valueKeyChain,
  value: valueFromProps,
  computedPropsRest,
}) {
  const { originalOnChange, options, schema } = useContext(EditorContext)

  const fullType = access(schema, schemaKeyChain)

  // istanbul ignore next
  if (!fullType) {
    console.error('Schema:', schema)
    console.error('Key chain:', schemaKeyChain)
    throw Error(
      `Invalid type found at ${schemaKeyChain.join(
        '.',
      )}: ${fullType}\n\n  schema: ${JSON.stringify(schema, null, 2)}`,
    )
  }

  const scopedOnChange = useAutoCallback((value) => {
    onChange(valueKeyChain, schemaKeyChain, value)
  })

  const isExpanded = Boolean(fullType.$type)
  const type = isExpanded ? fullType.$type : fullType

  const typeName = useAutoMemo(() => {
    switch (typeOf(type)) {
      case 'object':
        return '$object'
      case 'array':
        return '$array'
      case 'string':
        return type
      // istanbul ignore next
      default:
        throw Error('Invalid type: ' + typeOf(type))
    }
  })

  const isCustomArray = typeName === '$array' && typeof type[0] === 'symbol'

  const Editor = useAutoMemo(() => {
    if (isCustomArray) {
      const arrayType = type[0]
      if (!options.types[arrayType]) {
        throw Error(`Missing custom array editor for ${String(arrayType)}`)
      }
      return options.types[arrayType]
    } else {
      return options.types[typeName]
    }
  })

  const processedValue = useAutoMemo(() => {
    const value = access(valueFromProps, valueKeyChain)

    switch (typeName) {
      case '$object':
        if (typeOf(value) !== 'object') return {}
        return value
      case '$array':
        if (!util.isArrayLike(value)) return options.createArray()
        return value
      default:
        if (value === undefined) return Editor.defaultValue
        return value
    }
  })

  const children = useAutoMemo(() => {
    switch (typeName) {
      case '$object': {
        const children = []

        for (const key of Object.keys(type)) {
          children.push(
            <SubEditor
              key={key}
              schemaKeyChain={schemaKeyChain.concat(
                isExpanded ? ['$type', key] : [key],
              )}
              valueKeyChain={valueKeyChain.concat(key)}
              onChange={onChange}
              value={valueFromProps}
              Editor={SubEditor}
            />,
          )
        }

        return children
      }
      case '$array': {
        const children = []
        const value = processedValue
        const schemaIndex = isCustomArray ? '1' : '0'

        for (let i = 0; i < value.length; i++) {
          const nextKeyChain = schemaKeyChain.concat(
            isExpanded ? ['$type', schemaIndex] : schemaIndex,
          )
          const nextValueKeyChain = valueKeyChain.concat(i)

          children.push(
            <SubEditor
              key={i + '/' + value.length}
              schemaKeyChain={nextKeyChain}
              valueKeyChain={nextValueKeyChain}
              onChange={onChange}
              value={valueFromProps}
              Editor={SubEditor}
            />,
          )
        }

        return children
      }
      default:
        return null
    }
  })

  const label = useAutoMemo(() => {
    const parentType = access(schema, schemaKeyChain.slice(0, -1))

    if (util.isArrayLike(parentType)) {
      return util.decamelizeAndUppercaseFirst(
        util.singular(schemaKeyChain[schemaKeyChain.length - 2]) +
          ' ' +
          (Number(valueKeyChain[valueKeyChain.length - 1]) + 1),
      )
    }

    if (fullType && fullType.$label) return fullType.$label

    let label = schemaKeyChain[schemaKeyChain.length - 1]

    return util.decamelizeAndUppercaseFirst(label)
  })

  const computedProps = useAutoMemo(() => {
    if (typeof fullType.$computedProps === 'function') {
      const rest = util.isArrayLike(computedPropsRest) ? computedPropsRest : []
      return fullType.$computedProps(valueFromProps, ...rest)
    }
    return {}
  })

  const add = useAutoCallback(() => {
    if (typeName !== '$array') {
      throw Error('add() can only be called from array editors')
    }

    const array = (
      access(valueFromProps, schemaKeyChain) || options.createArray()
    ).concat(null)

    const newValue = deepSet(
      valueFromProps,
      valueKeyChain,
      array,
      schemaKeyChain,
      schema,
    )

    originalOnChange(newValue)
  })

  // istanbul ignore next
  if (!Editor) {
    throw Error(`No type with the name "${typeName}" has been registered`)
  }

  return useAutoMemo(
    <Editor
      onChange={scopedOnChange}
      schemaKeyChain={schemaKeyChain}
      valueKeyChain={valueKeyChain}
      schema={schema}
      label={label}
      value={processedValue}
      Editor={SubEditor}
      add={add}
      {...computedProps}
    >
      {children}
    </Editor>,
  )
}