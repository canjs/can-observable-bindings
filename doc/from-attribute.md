@typedef {function} can-observable-bindings/fromAttribute fromAttribute
@parent can-observable-bindings

@description Create a property and attribute binding on a `StacheElement`.

@signature `fromAttribute`

  Using `fromAttribute` will set up attribute and property bindings for a `StacheElement`:

  ```html
  <my-el name="Matt"></my-el>

  <script type="module">
  import { fromAttribute, StacheElement } from "can";

  class MyElement extends StacheElement {
	  static view = `
		  <p>{{this.name}}</p>
	  `;
	  static props = {
		  name: { type: String, bind: fromAttribute }
	  };
  }
  customElements.define("my-el", MyElement);
  </script>
  ```
  @codepen

@body

## Purpose

For creating bindings on a `StacheElement` for attributes and properties. If you set an attribute that will be reflected within the `StacheElement` properties.
