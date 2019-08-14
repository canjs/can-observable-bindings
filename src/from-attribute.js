const value = require("can-value");
const Bind = require("can-bind");
const canReflect = require("can-reflect");

const metaSymbol = Symbol.for("can.meta");

module.exports = function fromAttribute (propertyName) {
	// Handle the class constructor
	return function (ctr) {
		if (ctr[metaSymbol] === undefined) {
			ctr[metaSymbol] = {};
		}
		// Create array for all attributes we want to listen to change events for
		if (ctr[metaSymbol]._observedAttributes === undefined) {
			ctr[metaSymbol]._observedAttributes = [];
		}
		// Create object for attributeChangedCallback for each prop
		if (ctr[metaSymbol]._attributeChangedCallbackHandler === undefined) {
			ctr[metaSymbol]._attributeChangedCallbackHandler = {};
		}

		// Modify the class prototype here
		if (!ctr[metaSymbol]._hasInitializedAttributeBindings) {
			// Set up the static getter for `observedAttributes`			
			Object.defineProperty(ctr, "observedAttributes", {
				get() {
					return ctr[metaSymbol]._observedAttributes;
				}
			});

			ctr.prototype.attributeChangedCallback = function (prop) {
				ctr[metaSymbol]._attributeChangedCallbackHandler[prop].apply(this, arguments);
			};

			ctr[metaSymbol]._hasInitializedAttributeBindings = true;
		}
		// Push into `_observedAttributes` for `observedAttributes` getter
		ctr[metaSymbol]._observedAttributes.push(propertyName);

		// Create the attributeChangedCallback handler
		ctr[metaSymbol]._attributeChangedCallbackHandler[propertyName] = function (prop, oldVal, newVal) {
			if (this[metaSymbol] && this[metaSymbol]._attributeBindings && newVal !== oldVal) {
				canReflect.setValue(this[metaSymbol]._attributeBindings[prop], newVal);
			}
		};

		return function fromAttributeBind (instance) {
			// Child binding used by `attributeChangedCallback` to update the value when an attribute change occurs 
			const childValue = value.to(instance, propertyName);
			const bind = new Bind({
				parent: value.from(instance.getAttribute(propertyName) || undefined),
				child: childValue,
				queue: "dom",
				// During initialization prevent update of child
				onInitDoNotUpdateChild: true
			});

			if (instance[metaSymbol] === undefined) {
				instance[metaSymbol] = {};
			}
			if (instance[metaSymbol]._attributeBindings === undefined) {
				instance[metaSymbol]._attributeBindings = {};
			}

			// Push binding so it can be used within `attributeChangedCallback`
			instance[metaSymbol]._attributeBindings[propertyName] = childValue;

			return bind;
		};
	};
};
