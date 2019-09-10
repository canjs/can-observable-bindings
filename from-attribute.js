const value = require("can-value");
const Bind = require("can-bind");
const canReflect = require("can-reflect");
const canString = require("can-string");
const type = require("can-type");

//!steal-remove-start
if(process.env.NODE_ENV !== 'production') {
	var Observation = require("can-observation");
}
//!steal-remove-end

const metaSymbol = Symbol.for("can.meta");

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

	var lazyGetType = function() {
		var Type;
		var schema = canReflect.getSchema(ctr);
		if(schema) {
			Type = schema.keys[propertyName];
		}
		if(!Type) {
			Type = type.Any;
		}
		Type = type.convert(Type);
		lazyGetType = function() { return Type; };
		return Type;
	};

	return function fromAttributeBind (instance) {
		// Child binding used by `attributeChangedCallback` to update the value when an attribute change occurs
		const childValue = value.to(instance, propertyName);
		const intermediateValue = {};
		canReflect.assignSymbols(intermediateValue, {
			"can.setValue": function(value) {
				var converted = canReflect.convert(value, lazyGetType());
				canReflect.setValue(childValue, converted);
			}
		});
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
			child: intermediateValue,
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
		instance[metaSymbol]._attributeBindings[attributeName] = intermediateValue;

		return bind;
	};
}

module.exports = function fromAttribute (attributeName, ctr) {
	// Handle the class constructor
	if (arguments.length === 2) {
		return initializeFromAttribute(attributeName, ctr);
	} else {
		return function (propertyName, ctr) {
			return initializeFromAttribute(propertyName, ctr, attributeName);
		};
	}
};
