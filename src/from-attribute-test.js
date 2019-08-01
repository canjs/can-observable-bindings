const QUnit = require("steal-qunit");
const fromAttribute = require("./from-attribute");
const testHelpers = require("../test/helpers");

let fixture;
QUnit.module("can-observable-bindings - from-attribute", {
	beforeEach() {
		fixture = document.querySelector("#qunit-fixture");
	}
});

QUnit.test("setting attribute will set property", function(assert) {
	const done = assert.async();

	fixture.innerHTML = "<div id='attr-prop'></div>";
	const el = document.getElementById("attr-prop");

	const bindFn = fromAttribute('fname');
	const binding = bindFn(el);
	binding.start();

	el.setAttribute("fname", "Matt");

	testHelpers.afterMutation(() => {
		assert.equal(el.fname, "Matt", "Setting attribute sets a property");
		done();
	});
});

QUnit.test("property does not get set if the attribute does not exist", function(assert) {
	assert.expect(1);
	const done = assert.async();

	fixture.innerHTML = "<div id='attr-prop-nexist'></div>";
	const el = document.getElementById("attr-prop-nexist");

	Object.defineProperty(el, 'lname', {
		set (v) {
			console.log(v);
			assert.ok(false, "Should not be called as attribute does not exist");
			return v;
		}
	});

	const bindFn = fromAttribute('lname');
	const binding = bindFn(el);
	binding.start();

	testHelpers.afterMutation(() => {
		assert.equal(el.lname, undefined, "Should be undefined by default");
		done();
	});
});

