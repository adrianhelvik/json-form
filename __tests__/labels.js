import JsonForm from '../src/index.js'
import { mount } from 'enzyme'
import React from 'react'

const StringEditor = ({ onChange, value, label }) => (
  <div>
    <label>
      <div>{label}</div>
      <input onChange={onChange} value={value} />
    </label>
  </div>
)

const Form = JsonForm({
  types: {
    string: StringEditor
  }
})

describe('explicit labels', () => {
  it('uses the keys as labels by default', () => {
    const schema = {
      someTitle: 'string'
    }

    const wrapper = mount(<Form schema={schema} />)

    expect(wrapper.html()).toBe(
      '<div>' +
      /**/'<label>' +
      /**//**/'<div>Some title</div>' +
      /**//**/'<input>' +
      /**/'</label>' +
      '</div>'
    )
  })

  describe('setting explicit labels', () => {
    let value
      , wrapper

    beforeEach(() => {
      const schema = {
        someTitle: {
          $type: 'string',
          $label: 'My title',
        }
      }

      value = null
      const setValue = x => value = x
      wrapper = mount(<Form schema={schema} onChange={setValue} />)
    })

    it('sets the value for the correct key', () => {
      wrapper
        .find('input')
        .first()
        .simulate('change', { target: { value: 'Hello world' } })

      expect(value).toEqual({ someTitle: 'Hello world' })
    })

    it('renders the correct html', () => {
      expect(wrapper.html()).toBe(
        '<div>' +
        /**/'<label>' +
        /**//**/'<div>My title</div>' +
        /**//**/'<input>' +
        /**/'</label>' +
        '</div>'
      )
    })
  })
})