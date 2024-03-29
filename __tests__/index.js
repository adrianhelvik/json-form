import { mount } from 'enzyme'
import JsonForm from '../src'
import React from 'react'

const consoleError = console.error

beforeEach(() => {
  console.error = () => {}
})

afterEach(() => {
  console.error = consoleError
})

const StringEditor = ({ onChange, value }) => {
  return (
    <input
      className="string-editor"
      onChange={(e) => onChange(e.target.value)}
      value={value}
    />
  )
}

StringEditor.defaultValue = ''

class FauxArray {
  length = 0

  constructor(items) {
    for (let i = 0; i < items.length; i++) this.push(items[i])
  }

  push(item) {
    this[this.length++] = item
  }

  concat(item) {
    const items = []
    for (let i = 0; i < this.length; i++) items.push(this[i])
    items.push(item)
    return new this.constructor(items)
  }

  fauxArray = true
}

function fauxArray(array = []) {
  return new FauxArray(array)
}

describe('json-form', () => {
  it('throws an error unless the types property is supplied', () => {
    expect(() => JsonForm()).toThrow(/"types" is a required option/)
  })

  describe('single level', () => {
    const InputEditor = ({ onChange, value }) => (
      <input onChange={(e) => onChange(e.target.value)} />
    )

    const NumberEditor = ({ onChange, value }) => (
      <input
        type="number"
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      />
    )

    const Form = JsonForm({
      types: {
        number: NumberEditor,
        input: InputEditor,
      },
    })

    class FormContainer extends React.Component {
      state = {
        value: this.props.initialValue ?? {},
      }

      onChange = (value) => {
        this.setState({ value })
      }

      render() {
        return (
          <Form
            schema={this.props.schema}
            onChange={(value) => this.setState({ value })}
            value={{
              ...this.state,
            }}
          />
        )
      }
    }

    it('creates the correct DOM nodes', () => {
      const wrapper = mount(
        <FormContainer
          initialValue={{}}
          schema={{
            title: 'input',
            amount: 'number',
          }}
        />,
      )

      expect(wrapper.html()).toBe('<input><input type="number">')
    })

    it('can store a new value', () => {
      const wrapper = mount(
        <FormContainer
          initialValue={{}}
          schema={{
            title: 'input',
            amount: 'number',
          }}
        />,
      )

      const input = wrapper.find('input').first()

      input.simulate('change', { target: { value: 'Hello world' } })

      expect(wrapper.state('value').title).toBe('Hello world')
    })

    it('preserves the editor elements (and thus focus)', () => {
      const InputEditor = ({ onChange, value }) => {
        return <input onChange={(e) => onChange(e.target.value)} />
      }

      const Form = JsonForm({
        types: {
          input: InputEditor,
        },
      })

      const schema = {
        title: 'input',
      }

      function FormContainer() {
        const [value, setValue] = React.useState({})

        const onChange = (value) => {
          this.setState({ value })
        }

        return (
          <React.Fragment>
            <Form schema={schema} onChange={setValue} value={value} />
            <div>value.title is: {value.title}</div>
          </React.Fragment>
        )
      }

      document.body.appendChild(document.createElement('div'))

      const wrapper = mount(<FormContainer />, {
        attachTo: document.body.children[0],
      })

      const input = wrapper.find('input').first()
      const text = wrapper.find('div').first()

      const inputNode = input.getDOMNode()

      inputNode.focus()
      expect(document.activeElement.tagName).toBe('INPUT')

      wrapper.update()
      input.simulate('change', { target: { value: 'a' } })
      wrapper.update()
      input.simulate('change', { target: { value: 'b' } })
      input.simulate('change', { target: { value: 'c' } })

      expect(text.text()).toBe('value.title is: c')

      expect(document.activeElement.tagName).toBe('INPUT')
    })

    describe('$computedProps', () => {
      it('can be used without arguments', () => {
        const InputEditor = ({ onChange, value, maxLength }) => (
          <input
            onChange={(e) => {
              if (e.target.value.length >= maxLength)
                e.target.value = e.target.value.slice(0, maxLength)
              onChange(e.target.value)
            }}
          />
        )

        const Form = JsonForm({
          types: {
            input: InputEditor,
          },
        })

        class FormContainer extends React.Component {
          state = {
            value: {},
          }

          onChange = (value) => {
            this.setState({ value })
          }

          render() {
            return (
              <Form
                schema={{
                  title: {
                    $type: 'input',
                    $computedProps() {
                      return {
                        maxLength: 3,
                      }
                    },
                  },
                }}
                onChange={this.onChange}
                value={this.state.value}
              />
            )
          }
        }

        const wrapper = mount(<FormContainer />)

        const input = wrapper.find('input').first()

        expect(input).toBeDefined()
        expect(input.html()).toBe('<input>')
        input.simulate('change', { target: { value: 'Hello world' } })
        expect(wrapper.state('value').title).toBe('Hello world')
      })

      it('takes options as the first parameter of $computedProps', () => {
        const InputEditor = ({ onChange, value, maxLength }) => (
          <input
            className="input-editor"
            onChange={(e) => {
              if (e.target.value.length >= maxLength)
                e.target.value = e.target.value.slice(0, maxLength)
              onChange(e.target.value)
            }}
          />
        )

        const NumberEditor = ({ onChange, value }) => (
          <input
            className="number-editor"
            onChange={(e) => {
              if (e.target.value === '') onChange(null)
              else onChange(parseInt(e.target.value, 10))
            }}
          />
        )

        const Form = JsonForm({
          types: {
            input: InputEditor,
            number: NumberEditor,
          },
        })

        class FormContainer extends React.Component {
          state = {
            value: {},
          }

          onChange = (value) => {
            this.setState({ value })
          }

          render() {
            return (
              <Form
                schema={{
                  maxLength: 'number',
                  title: {
                    $type: 'input',
                    $computedProps({ maxLength }) {
                      return { maxLength }
                    },
                  },
                }}
                onChange={this.onChange}
                value={this.state.value}
              />
            )
          }
        }

        const wrapper = mount(<FormContainer />)

        const numberEditor = wrapper.find('.number-editor').first()
        expect(numberEditor).toBeDefined()

        const inputEditor = wrapper.find('.input-editor').first()
        expect(inputEditor).toBeDefined()

        numberEditor.simulate('change', { target: { value: '5' } })
        inputEditor.simulate('change', { target: { value: 'foobar' } })

        expect(wrapper.state('value').title).toBe('foobar')
      })

      it('can take another input as its second parmeter', () => {
        const InputEditor = ({ onChange, value, maxLength }) => (
          <input
            className="input-editor"
            onChange={(e) => {
              if (e.target.value.length >= maxLength)
                e.target.value = e.target.value.slice(0, maxLength)
              onChange(e.target.value)
            }}
          />
        )

        const Form = JsonForm({
          types: {
            input: InputEditor,
          },
        })

        class FormContainer extends React.Component {
          state = {
            value: {},
          }

          onChange = (value) => {
            this.setState({ value })
          }

          render() {
            return (
              <Form
                schema={{
                  title: {
                    $type: 'input',
                    $computedProps(_, maxLength) {
                      return { maxLength }
                    },
                  },
                }}
                onChange={this.onChange}
                value={this.state.value}
                computedPropsRest={[3]}
              />
            )
          }
        }

        const wrapper = mount(<FormContainer />)

        wrapper
          .find('.input-editor')
          .first()
          .simulate('change', { target: { value: 'foobar' } })

        expect(wrapper.state('value').title).toBe('foobar')
      })
    })
  })

  describe('multi level', () => {
    describe('object editor', () => {
      let wrapper
      let noObjectEditor = false

      beforeEach(() => {
        const InputEditor = ({ onChange, value = '' }) => (
          <input onChange={(e) => onChange(e.target.value)} value={value} />
        )
        InputEditor.defaultValue = ''
        const ObjectEditor = ({ children }) => (
          <div className="object-editor">{children}</div>
        )

        const Form = JsonForm({
          types: {
            input: InputEditor,
            $object: noObjectEditor ? null : ObjectEditor,
          },
        })

        const schema = {
          general: {
            title: 'input',
          },
        }

        class FormContainer extends React.Component {
          state = {
            value: {
              general: {
                title: '',
              },
            },
          }

          onChange = (value) => {
            this.setState({ value })
          }

          render() {
            return (
              <Form
                schema={schema}
                onChange={this.onChange}
                value={this.state.value}
              />
            )
          }
        }

        wrapper = mount(<FormContainer />)
        noObjectEditor = false
      })

      it('defaults to a simple div', () => {
        const value = {}
        const Form = JsonForm({
          types: {
            input: () => <input />,
          },
        })
        const schema = { general: { title: 'input' } }
        const wrapper = mount(
          <Form schema={schema} value={value} onChange={() => {}} />,
        )

        expect(wrapper.html()).toBe('<div>' + /**/ '<input>' + '</div>')
      })

      it('can create object editors', () => {
        const objectEditor = wrapper.find('.object-editor')
        expect(objectEditor.length).toBe(1)

        const input = wrapper.find('input').first()

        expect(input.length).toBe(1)
        input.simulate('change', { target: { value: 'Hello world' } })
        expect(wrapper.state('value').general.title).toBe('Hello world')
      })
    })

    describe('array editors', () => {
      let wrapper, value, schema, types

      beforeEach(() => {
        types = {
          input: Object.assign(
            ({ value, onChange }) => (
              <input
                className="input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            ),
            { defaultValue: '' },
          ),
          $object: ({ children }) => <div className="object">{children}</div>,
          $array: ({ children, add }) => (
            <div className="array">
              {children}
              <button onClick={add}>Add item</button>
            </div>
          ),
        }
      })

      const render = () => {
        const Form = JsonForm({
          types,
        })

        function Container() {
          const [state, setState] = React.useState(value)

          value = state

          return <Form schema={schema} onChange={setState} value={state} />
        }

        wrapper = mount(<Container />)
      }

      afterEach(() => {
        value = {}
        schema = null
        wrapper = null
      })

      it('passes the correct children to array editors', () => {
        schema = {
          options: [{ text: 'input' }],
        }
        value = {
          options: [{ text: 'foo' }],
        }

        render()

        expect(wrapper.html()).toBe(
          '<div class="array">' +
            /**/ '<div class="object">' +
            /**/ /**/ '<input class="input" value="foo">' +
            /**/ '</div>' +
            /**/ '<button>Add item</button>' +
            '</div>',
        )
      })

      it('passes the correct default children to array editors', () => {
        types.$array = null

        schema = {
          options: [{ text: 'input' }],
        }
        value = {
          options: [{ text: 'foo' }],
        }

        render()

        expect(wrapper.html()).toBe(
          '<div>' +
            /**/ '<div class="object">' +
            /**/ /**/ '<input class="input" value="foo">' +
            /**/ '</div>' +
            /**/ '<button>Add item</button>' +
            '</div>',
        )
      })

      it('changes the state correctly for array editors', () => {
        schema = {
          options: [{ text: 'input' }],
        }
        value = {
          options: [{ text: 'foo' }],
        }

        render()
        wrapper
          .find('input')
          .first()
          .simulate('change', { target: { value: 'Hello world' } })

        expect(value.options[0].text).toBe('Hello world')
      })

      it('discards non-array values', () => {
        schema = {
          options: [{ text: 'input' }],
        }
        value = {
          options: 'non-array',
        }

        render()

        expect(wrapper.find('input').length).toBe(0)
      })

      it('supports adding a new array item', () => {
        schema = {
          options: [{ text: 'input' }],
        }
        value = {
          options: [],
        }

        render()

        wrapper.find('button').simulate('click')

        expect(value.options.length).toBe(1)
        expect(value.options).toEqual([{ text: '' }])
      })

      it('supports creating an initial array', () => {
        schema = {
          options: [{ text: 'input' }],
        }
        value = {}

        render()
        wrapper.find('button').simulate('click')

        expect(value.options.length).toBe(1)
      })
    })
  })

  test("when onChange isn't provided a nice error message is shown", () => {
    const Form = JsonForm({
      types: {
        string({ value, onChange }) {
          return (
            <input value={value} onChange={(e) => onChange(e.target.value)} />
          )
        },
      },
    })

    console.error = () => {}

    expect(() => {
      mount(<Form />)
    }).toThrow(/onChange function/)
  })

  test('you cannot call add from a non-array editor', () => {
    const Form = JsonForm({
      types: {
        string({ add }) {
          add()
          return null
        },
      },
    })

    console.error = () => {}

    expect(() => {
      mount(<Form schema={{ foo: 'string' }} onChange={() => {}} />)
    }).toThrow('add is not a function')
  })

  it('coerces non-objects to objects', () => {
    const Form = JsonForm({
      types: {
        string: StringEditor,
      },
    })

    const wrapper = mount(
      <Form
        onChange={() => {}}
        schema={{ foo: { bar: 'string' } }}
        value={{
          foo: 'not-an-object',
        }}
      />,
    )

    // prettier-ignore
    expect(wrapper.html()).toBe(
      '<div>' +
      /**/ '<input class="string-editor" value="">' +
      '</div>'
    )
  })

  it('coerces non-arrays to arrays', () => {
    const Form = JsonForm({
      types: {
        string: StringEditor,
      },
    })

    const wrapper = mount(
      <Form
        onChange={() => {}}
        schema={{ foo: ['string'] }}
        value={{
          foo: 'not-an-array',
        }}
      />,
    )

    // prettier-ignore
    expect(wrapper.html()).toBe(
      '<div>' +
      /**/ '<button>Add item</button>' +
      '</div>'
    )
  })

  it('coerces non-objects to objects when changes occur down-tree', () => {
    const Form = JsonForm({
      types: {
        string: StringEditor,
      },
    })

    let updatedValue

    const Container = () => {
      let [value, setValue] = React.useState()

      updatedValue = value

      return (
        <Form
          onChange={setValue}
          schema={{ foo: { bar: { baz: 'string' } } }}
          value={{
            foo: Object.assign([], {
              bar: {
                baz: 'Hello world',
              },
            }),
          }}
        />
      )
    }

    const wrapper = mount(<Container />)

    wrapper.find('input').simulate('change', { target: { value: 'Updated!' } })

    expect(updatedValue?.foo?.bar?.baz).toBe('Updated!')

    expect(updatedValue).toEqual({
      foo: {
        bar: {
          baz: 'Updated!',
        },
      },
    })
  })
})
