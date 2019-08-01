const value = require("can-value");
const Bind = require("can-bind");
const canReflect = require("can-reflect");
const queues = require("can-queues");
const domMutateEvents = require("can-dom-mutate/events/events");
const domEvents = require("can-dom-events");
const AttributeObservable = require("can-attribute-observable");

// Allow for attribute events
domEvents.addEvent(domMutateEvents.attributes);

function ElementAttributeObservable (el, prop, bindingData, event) {
	if(typeof bindingData === "string") {
		event = bindingData;
		bindingData = undefined;
	}

	this.el = el;
	this.bound = false;
	this.prop = prop;
	this.event = event;
	this.handler = this.handler.bind(this);
}
ElementAttributeObservable.prototype = Object.create(AttributeObservable.prototype);

ElementAttributeObservable.prototype.handler = function handler (newVal, event) {
	var old = this._value;
	var queuesArgs = [];
	this._value = this.el.getAttribute(this.prop);

	// If we have an event then we want to enqueue on all changes
	// otherwise only enquue when there are changes to the value
	if (event !== undefined || this._value !== old) {
		//!steal-remove-start
		if(process.env.NODE_ENV !== 'production') {
			if (typeof this._log === "function") {
				this._log(old, newVal);
			}
		}
		//!steal-remove-end


		queuesArgs = [
			this.handlers.getNode([]),
			this,
			[newVal, old]
		];
		//!steal-remove-start
		if(process.env.NODE_ENV !== 'production') {
			queuesArgs = [
				this.handlers.getNode([]),
				this,
				[newVal, old]
				/* jshint laxcomma: true */
				,null
				,[this.el,this.prop,"changed to", newVal, "from", old, "by", event]
				/* jshint laxcomma: false */
			];
		}
		//!steal-remove-end
		// adds callback handlers to be called w/i their respective queue.
		queues.enqueueByQueue.apply(queues, queuesArgs);
	}
};

ElementAttributeObservable.prototype.onBound = function onBound() {
	var observable = this;

	observable.bound = true;

	// make sure `this.handler` gets the new value instead of
	// the event object passed to the event handler
	observable._handler = function(event) {
		observable.handler(observable.el.getAttribute(observable.prop), event);
	};

	domEvents.addEventListener(observable.el, observable.event, observable._handler);

	// initial value
	this._value = this.el.getAttribute(this.prop);
};

ElementAttributeObservable.prototype.onUnbound = function onUnbound() {
	var observable = this;

	observable.bound = false;

	domEvents.removeEventListener(observable.el, observable.event, observable._handler);
};

ElementAttributeObservable.prototype.get = function get () {
	const val = this.el.getAttribute(this.prop);
	return val;
};
ElementAttributeObservable.prototype.set = function set (newVal) {
	this.el.setAttribute(this.prop, newVal);
	return newVal;
};

canReflect.assignSymbols(ElementAttributeObservable.prototype, {
	"can.isMapLike": false,
	"can.getValue": ElementAttributeObservable.prototype.get,
	"can.setValue": ElementAttributeObservable.prototype.set,
});

module.exports = function fromAttribute (propertyName) {
	return function fromAttributeBind (instance) {
		const bind = new Bind({
			parent: new ElementAttributeObservable(instance, propertyName, {}, 'attributes'),
			child: value.to(instance, propertyName),
			queue: "domUI"
		});

		// This is to prevent canReflect from reading the parent value and setting the child
		// when the parent / instance doesn't have an attribute
		const origUpdateChild = bind._updateChild;
		bind._updateChild = function() {
			if (instance.hasAttribute(propertyName)) {
				origUpdateChild.apply(this, arguments);
			}
		};

		return bind;
	};
};
