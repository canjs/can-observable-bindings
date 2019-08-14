const QUnit = require("steal-qunit");
const fromAttribute = require("./from-attribute");

let fixture;
QUnit.module("can-observable-bindings - from-attribute", {
	beforeEach() {
		fixture = document.querySelector("#qunit-fixture");
	}
});

QUnit.test("setting attribute will set property", function (assert) {
	const attributes = ["fname", "lname", "city"];
	const bindings = [];
	let attributeChangedCallbackCount = 0;
	class MyEl extends HTMLElement {
		static get observedAttributes () {
			return attributes;
		}
	}

	attributes.forEach(attribute => {
		const ctrBinding = fromAttribute(attribute);
		bindings.push(ctrBinding(MyEl));
	});
	
	// Overwrite the attributeChangedCallback to check we only get called twice
	const originalCallback = MyEl.prototype.attributeChangedCallback;
	MyEl.prototype.attributeChangedCallback = function () {
		attributeChangedCallbackCount++;
		originalCallback.apply(this, arguments);
	};
	
	customElements.define("my-el", MyEl);
	const el = document.createElement("my-el");
	fixture.appendChild(el);

	bindings.forEach(bindFn => {
		const binding = bindFn(el);
		binding.start();
	});

	el.setAttribute("fname", "Matt");
	el.setAttribute("lname", "Chaffe");
	assert.equal(el.fname, "Matt", "Setting attribute sets a property");
	assert.equal(el.lname, "Chaffe", "Setting attribute sets a property");
	assert.equal(attributeChangedCallbackCount, 2, "attributeChangedCallback fires twice");
});

QUnit.test("Does not set properties when attributes do not exist", function (assert) {
	const attributes = ["fname"];
	const bindings = [];
	class MyEl extends HTMLElement {
		get fname () {}
		set fname (val) {
			assert.ok(!val, "This should not be set");
		}

		static get observedAttributes () {
			return attributes;
		}
	}

	attributes.forEach(attribute => {
		const ctrBinding = fromAttribute(attribute);
		bindings.push(ctrBinding(MyEl));
	});
	
	customElements.define("my-el-1", MyEl);
	const el = document.createElement("my-el-1");
	fixture.appendChild(el);
	
	bindings.forEach(bindFn => {
		const binding = bindFn(el);
		binding.start();
	});

	assert.strictEqual(el.fname, undefined, "Property not set");
});
