const value = require("can-value");
const Bind = require("can-bind");
const canReflect = require("can-reflect");
const canString = require("can-string");

//!steal-remove-start
if(process.env.NODE_ENV !== 'production') {
	var Observation = require("can-observation");
}
//!steal-remove-end

const metaSymbol = Symbol.for("can.meta");

// fromAttribute('attribute-name') //-> will t
// fromAttribute

module.exports = function fromAttribute (attributeName, ctr) {
	// Handle the class constructor
	if (arguments.length === 2) {
		return initializeFromAttribute(attributeName, ctr)
	} else {
		return function (propertyName, ctr) {
			return initializeFromAttribute(propertyName, ctr, attributeName)
		}
	}
};

function initializeFromAttribute (propertyName, ctr, attributeName) {
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
	if (attributeName === undefined) {
		attributeName = propertyName;
	}
	// Ensure the attributeName is hyphen case
	attributeName = canString.hyphenate(attributeName);

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
	ctr[metaSymbol]._observedAttributes.push(attributeName);

	// Create the attributeChangedCallback handler
	ctr[metaSymbol]._attributeChangedCallbackHandler[attributeName] = function (prop, oldVal, newVal) {
		if (this[metaSymbol] && this[metaSymbol]._attributeBindings && newVal !== oldVal) {
			canReflect.setValue(this[metaSymbol]._attributeBindings[prop], newVal);
		}
	};

	return function fromAttributeBind (instance) {
		// Child binding used by `attributeChangedCallback` to update the value when an attribute change occurs 
		const childValue = value.to(instance, propertyName);
		const parentValue = value.from(instance.getAttribute(attributeName) || undefined);
		//!steal-remove-start
		if(process.env.NODE_ENV !== 'production') {
			// Ensure pretty names for dep graph
			canReflect.assignSymbols(parentValue, {
				"can.getName": function getName() {
					return (
						"FromAttribute<" +
						instance.nodeName.toLowerCase() +
						"." +
						attributeName +
						">"
					);
				}
			});
			canReflect.assignSymbols(childValue, {
				"can.getName": function getName() {
					return (
						"Observation<" +
						canReflect.getName(parentValue) +
						">"
					);
				}
			});
			// Create temporary binding to initialize dep graph
			Observation.temporarilyBind(childValue);
		}
		//!steal-remove-end
		const bind = new Bind({
			parent: parentValue,
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
		instance[metaSymbol]._attributeBindings[attributeName] = childValue;

		return bind;
	};
};
