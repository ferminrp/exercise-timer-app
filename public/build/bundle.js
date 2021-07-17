
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Form.svelte generated by Svelte v3.38.3 */
    const file$2 = "src\\Form.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let label1;
    	let t6;
    	let input1;
    	let t7;
    	let label2;
    	let t9;
    	let input2;
    	let t10;
    	let label3;
    	let t12;
    	let input3;
    	let t13;
    	let label4;
    	let t15;
    	let input4;
    	let t16;
    	let p0;
    	let t17;
    	let t18;
    	let t19;
    	let t20;
    	let p1;
    	let t21;
    	let t22;
    	let t23;
    	let t24;
    	let p2;
    	let t25;
    	let t26;
    	let t27;
    	let t28;
    	let p3;
    	let t29;
    	let t30;
    	let t31;
    	let t32;
    	let p4;
    	let t33;
    	let t34;
    	let t35;
    	let t36;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Timer de Prueba";
    			t1 = space();
    			label0 = element("label");
    			label0.textContent = "Cuantos ejercicios vas a hacer?";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			label1 = element("label");
    			label1.textContent = "Cuantos series vas a hacer?";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			label2 = element("label");
    			label2.textContent = "Cuantos segundos dura cada ejercicio?";
    			t9 = space();
    			input2 = element("input");
    			t10 = space();
    			label3 = element("label");
    			label3.textContent = "Cuantos segundos de descanso entre cada ejercicio?";
    			t12 = space();
    			input3 = element("input");
    			t13 = space();
    			label4 = element("label");
    			label4.textContent = "Cuantos segundos entre cada serie?";
    			t15 = space();
    			input4 = element("input");
    			t16 = space();
    			p0 = element("p");
    			t17 = text("Vas a hacer ");
    			t18 = text(/*exerciseAmount*/ ctx[2]);
    			t19 = text(" ejercicios");
    			t20 = space();
    			p1 = element("p");
    			t21 = text("Vas a hacer ");
    			t22 = text(/*series*/ ctx[1]);
    			t23 = text(" series");
    			t24 = space();
    			p2 = element("p");
    			t25 = text("Cada ejercicio va a durar ");
    			t26 = text(/*exerciseTime*/ ctx[0]);
    			t27 = text(" segundos");
    			t28 = space();
    			p3 = element("p");
    			t29 = text("El tiempo de descanso entre ejercicios es de ");
    			t30 = text(/*restTime*/ ctx[3]);
    			t31 = text(" segundos");
    			t32 = space();
    			p4 = element("p");
    			t33 = text("El tiempo entre series es de ");
    			t34 = text(/*resetTime*/ ctx[4]);
    			t35 = text(" segundos");
    			t36 = space();
    			button = element("button");
    			button.textContent = "Start";
    			add_location(h1, file$2, 15, 4, 335);
    			attr_dev(label0, "for", "exerciseAmount");
    			attr_dev(label0, "class", "svelte-l48lbq");
    			add_location(label0, file$2, 17, 4, 367);
    			attr_dev(input0, "name", "exerciseAmount");
    			attr_dev(input0, "id", "exerciseAmount");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "svelte-l48lbq");
    			add_location(input0, file$2, 18, 4, 440);
    			attr_dev(label1, "for", "series");
    			attr_dev(label1, "class", "svelte-l48lbq");
    			add_location(label1, file$2, 25, 4, 580);
    			attr_dev(input1, "name", "series");
    			attr_dev(input1, "id", "series");
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "svelte-l48lbq");
    			add_location(input1, file$2, 26, 4, 641);
    			attr_dev(label2, "for", "exerciseTime");
    			attr_dev(label2, "class", "svelte-l48lbq");
    			add_location(label2, file$2, 28, 4, 716);
    			attr_dev(input2, "name", "exerciseTime");
    			attr_dev(input2, "id", "exerciseTime");
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "class", "svelte-l48lbq");
    			add_location(input2, file$2, 29, 4, 793);
    			attr_dev(label3, "for", "restTime");
    			attr_dev(label3, "class", "svelte-l48lbq");
    			add_location(label3, file$2, 36, 4, 927);
    			attr_dev(input3, "name", "restTime");
    			attr_dev(input3, "id", "restTime");
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "class", "svelte-l48lbq");
    			add_location(input3, file$2, 39, 4, 1029);
    			attr_dev(label4, "for", "resetTime");
    			attr_dev(label4, "class", "svelte-l48lbq");
    			add_location(label4, file$2, 41, 4, 1110);
    			attr_dev(input4, "name", "resetTime");
    			attr_dev(input4, "id", "resetTime");
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "class", "svelte-l48lbq");
    			add_location(input4, file$2, 42, 4, 1181);
    			attr_dev(p0, "class", "svelte-l48lbq");
    			add_location(p0, file$2, 44, 4, 1265);
    			attr_dev(p1, "class", "svelte-l48lbq");
    			add_location(p1, file$2, 45, 4, 1317);
    			attr_dev(p2, "class", "svelte-l48lbq");
    			add_location(p2, file$2, 46, 4, 1357);
    			attr_dev(p3, "class", "svelte-l48lbq");
    			add_location(p3, file$2, 47, 4, 1419);
    			attr_dev(p4, "class", "svelte-l48lbq");
    			add_location(p4, file$2, 48, 4, 1496);
    			add_location(div, file$2, 14, 0, 324);
    			add_location(button, file$2, 51, 0, 1564);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, label0);
    			append_dev(div, t3);
    			append_dev(div, input0);
    			set_input_value(input0, /*exerciseAmount*/ ctx[2]);
    			append_dev(div, t4);
    			append_dev(div, label1);
    			append_dev(div, t6);
    			append_dev(div, input1);
    			set_input_value(input1, /*series*/ ctx[1]);
    			append_dev(div, t7);
    			append_dev(div, label2);
    			append_dev(div, t9);
    			append_dev(div, input2);
    			set_input_value(input2, /*exerciseTime*/ ctx[0]);
    			append_dev(div, t10);
    			append_dev(div, label3);
    			append_dev(div, t12);
    			append_dev(div, input3);
    			set_input_value(input3, /*restTime*/ ctx[3]);
    			append_dev(div, t13);
    			append_dev(div, label4);
    			append_dev(div, t15);
    			append_dev(div, input4);
    			set_input_value(input4, /*resetTime*/ ctx[4]);
    			append_dev(div, t16);
    			append_dev(div, p0);
    			append_dev(p0, t17);
    			append_dev(p0, t18);
    			append_dev(p0, t19);
    			append_dev(div, t20);
    			append_dev(div, p1);
    			append_dev(p1, t21);
    			append_dev(p1, t22);
    			append_dev(p1, t23);
    			append_dev(div, t24);
    			append_dev(div, p2);
    			append_dev(p2, t25);
    			append_dev(p2, t26);
    			append_dev(p2, t27);
    			append_dev(div, t28);
    			append_dev(div, p3);
    			append_dev(p3, t29);
    			append_dev(p3, t30);
    			append_dev(p3, t31);
    			append_dev(div, t32);
    			append_dev(div, p4);
    			append_dev(p4, t33);
    			append_dev(p4, t34);
    			append_dev(p4, t35);
    			insert_dev(target, t36, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[7]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[8]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[9]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[10]),
    					listen_dev(button, "click", /*start*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*exerciseAmount*/ 4 && input0.value !== /*exerciseAmount*/ ctx[2]) {
    				set_input_value(input0, /*exerciseAmount*/ ctx[2]);
    			}

    			if (dirty & /*series*/ 2 && input1.value !== /*series*/ ctx[1]) {
    				set_input_value(input1, /*series*/ ctx[1]);
    			}

    			if (dirty & /*exerciseTime*/ 1 && input2.value !== /*exerciseTime*/ ctx[0]) {
    				set_input_value(input2, /*exerciseTime*/ ctx[0]);
    			}

    			if (dirty & /*restTime*/ 8 && input3.value !== /*restTime*/ ctx[3]) {
    				set_input_value(input3, /*restTime*/ ctx[3]);
    			}

    			if (dirty & /*resetTime*/ 16 && input4.value !== /*resetTime*/ ctx[4]) {
    				set_input_value(input4, /*resetTime*/ ctx[4]);
    			}

    			if (dirty & /*exerciseAmount*/ 4) set_data_dev(t18, /*exerciseAmount*/ ctx[2]);
    			if (dirty & /*series*/ 2) set_data_dev(t22, /*series*/ ctx[1]);
    			if (dirty & /*exerciseTime*/ 1) set_data_dev(t26, /*exerciseTime*/ ctx[0]);
    			if (dirty & /*restTime*/ 8) set_data_dev(t30, /*restTime*/ ctx[3]);
    			if (dirty & /*resetTime*/ 16) set_data_dev(t34, /*resetTime*/ ctx[4]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t36);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Form", slots, []);
    	const dispatcher = createEventDispatcher();
    	let { exerciseTime } = $$props;
    	let { series } = $$props;
    	let { exerciseAmount } = $$props;
    	let { restTime } = $$props;
    	let { resetTime } = $$props;

    	function start() {
    		dispatcher("start");
    	}

    	const writable_props = ["exerciseTime", "series", "exerciseAmount", "restTime", "resetTime"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Form> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		exerciseAmount = this.value;
    		$$invalidate(2, exerciseAmount);
    	}

    	function input1_input_handler() {
    		series = this.value;
    		$$invalidate(1, series);
    	}

    	function input2_input_handler() {
    		exerciseTime = this.value;
    		$$invalidate(0, exerciseTime);
    	}

    	function input3_input_handler() {
    		restTime = this.value;
    		$$invalidate(3, restTime);
    	}

    	function input4_input_handler() {
    		resetTime = this.value;
    		$$invalidate(4, resetTime);
    	}

    	$$self.$$set = $$props => {
    		if ("exerciseTime" in $$props) $$invalidate(0, exerciseTime = $$props.exerciseTime);
    		if ("series" in $$props) $$invalidate(1, series = $$props.series);
    		if ("exerciseAmount" in $$props) $$invalidate(2, exerciseAmount = $$props.exerciseAmount);
    		if ("restTime" in $$props) $$invalidate(3, restTime = $$props.restTime);
    		if ("resetTime" in $$props) $$invalidate(4, resetTime = $$props.resetTime);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatcher,
    		exerciseTime,
    		series,
    		exerciseAmount,
    		restTime,
    		resetTime,
    		start
    	});

    	$$self.$inject_state = $$props => {
    		if ("exerciseTime" in $$props) $$invalidate(0, exerciseTime = $$props.exerciseTime);
    		if ("series" in $$props) $$invalidate(1, series = $$props.series);
    		if ("exerciseAmount" in $$props) $$invalidate(2, exerciseAmount = $$props.exerciseAmount);
    		if ("restTime" in $$props) $$invalidate(3, restTime = $$props.restTime);
    		if ("resetTime" in $$props) $$invalidate(4, resetTime = $$props.resetTime);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		exerciseTime,
    		series,
    		exerciseAmount,
    		restTime,
    		resetTime,
    		start,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler
    	];
    }

    class Form extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			exerciseTime: 0,
    			series: 1,
    			exerciseAmount: 2,
    			restTime: 3,
    			resetTime: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Form",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*exerciseTime*/ ctx[0] === undefined && !("exerciseTime" in props)) {
    			console.warn("<Form> was created without expected prop 'exerciseTime'");
    		}

    		if (/*series*/ ctx[1] === undefined && !("series" in props)) {
    			console.warn("<Form> was created without expected prop 'series'");
    		}

    		if (/*exerciseAmount*/ ctx[2] === undefined && !("exerciseAmount" in props)) {
    			console.warn("<Form> was created without expected prop 'exerciseAmount'");
    		}

    		if (/*restTime*/ ctx[3] === undefined && !("restTime" in props)) {
    			console.warn("<Form> was created without expected prop 'restTime'");
    		}

    		if (/*resetTime*/ ctx[4] === undefined && !("resetTime" in props)) {
    			console.warn("<Form> was created without expected prop 'resetTime'");
    		}
    	}

    	get exerciseTime() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set exerciseTime(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get series() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set series(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get exerciseAmount() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set exerciseAmount(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restTime() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restTime(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get resetTime() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set resetTime(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Timer.svelte generated by Svelte v3.38.3 */
    const file$1 = "src\\Timer.svelte";

    function create_fragment$1(ctx) {
    	let h2;
    	let t0;
    	let h2_class_value;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			t0 = text(/*timer*/ ctx[0]);
    			t1 = space();
    			button = element("button");
    			button.textContent = "Cancel";
    			attr_dev(h2, "class", h2_class_value = "" + (null_to_empty(/*mode*/ ctx[1]) + " svelte-2h3j5x"));
    			attr_dev(h2, "id", "timer");
    			add_location(h2, file$1, 13, 0, 262);
    			add_location(button, file$1, 14, 0, 306);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			append_dev(h2, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*cancel*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*timer*/ 1) set_data_dev(t0, /*timer*/ ctx[0]);

    			if (dirty & /*mode*/ 2 && h2_class_value !== (h2_class_value = "" + (null_to_empty(/*mode*/ ctx[1]) + " svelte-2h3j5x"))) {
    				attr_dev(h2, "class", h2_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Timer", slots, []);
    	const dispatch = createEventDispatcher();
    	let { timer } = $$props;
    	let { mode } = $$props;

    	function cancel() {
    		dispatch("cancel");
    	}

    	const writable_props = ["timer", "mode"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Timer> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("timer" in $$props) $$invalidate(0, timer = $$props.timer);
    		if ("mode" in $$props) $$invalidate(1, mode = $$props.mode);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		timer,
    		mode,
    		cancel
    	});

    	$$self.$inject_state = $$props => {
    		if ("timer" in $$props) $$invalidate(0, timer = $$props.timer);
    		if ("mode" in $$props) $$invalidate(1, mode = $$props.mode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [timer, mode, cancel];
    }

    class Timer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { timer: 0, mode: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Timer",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*timer*/ ctx[0] === undefined && !("timer" in props)) {
    			console.warn("<Timer> was created without expected prop 'timer'");
    		}

    		if (/*mode*/ ctx[1] === undefined && !("mode" in props)) {
    			console.warn("<Timer> was created without expected prop 'mode'");
    		}
    	}

    	get timer() {
    		throw new Error("<Timer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set timer(value) {
    		throw new Error("<Timer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get mode() {
    		throw new Error("<Timer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mode(value) {
    		throw new Error("<Timer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.38.3 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    // (111:4) {:else}
    function create_else_block(ctx) {
    	let timer_1;
    	let current;

    	timer_1 = new Timer({
    			props: {
    				mode: /*mode*/ ctx[2],
    				timer: /*timer*/ ctx[0],
    				exercising: /*exercising*/ ctx[1]
    			},
    			$$inline: true
    		});

    	timer_1.$on("cancel", /*cancel*/ ctx[9]);

    	const block = {
    		c: function create() {
    			create_component(timer_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(timer_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const timer_1_changes = {};
    			if (dirty & /*mode*/ 4) timer_1_changes.mode = /*mode*/ ctx[2];
    			if (dirty & /*timer*/ 1) timer_1_changes.timer = /*timer*/ ctx[0];
    			if (dirty & /*exercising*/ 2) timer_1_changes.exercising = /*exercising*/ ctx[1];
    			timer_1.$set(timer_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(timer_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(timer_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(timer_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(111:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (102:4) {#if !exercising}
    function create_if_block(ctx) {
    	let form;
    	let current;

    	form = new Form({
    			props: {
    				exerciseTime: /*exerciseTime*/ ctx[3],
    				series: /*series*/ ctx[5],
    				exerciseAmount: /*exerciseAmount*/ ctx[4],
    				restTime: /*restTime*/ ctx[6],
    				resetTime: /*resetTime*/ ctx[7]
    			},
    			$$inline: true
    		});

    	form.$on("start", /*start*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(form.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(form, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(form.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(form.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(form, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(102:4) {#if !exercising}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let current_block_type_index;
    	let if_block;
    	let main_class_value;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*exercising*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if_block.c();
    			attr_dev(main, "class", main_class_value = "" + (null_to_empty(/*mode*/ ctx[2]) + " svelte-3qnuv3"));
    			add_location(main, file, 100, 0, 3001);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if_blocks[current_block_type_index].m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(main, null);
    			}

    			if (!current || dirty & /*mode*/ 4 && main_class_value !== (main_class_value = "" + (null_to_empty(/*mode*/ ctx[2]) + " svelte-3qnuv3"))) {
    				attr_dev(main, "class", main_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let exerciseTime = 20;
    	let exerciseAmount = 4;
    	let series = 3;
    	let restTime = 10;
    	let resetTime = 5;
    	let timer = "Get Ready!";
    	let exercising = false;
    	let mode;

    	// utility function for timeouts
    	const delay = ms => new Promise(res => setTimeout(res, ms));

    	function start() {
    		console.log("starting!");
    		$$invalidate(1, exercising = true);
    		preWorkoutTimer();
    	} // Por cada serie

    	function cancel() {
    		$$invalidate(1, exercising = false);
    		$$invalidate(2, mode = null);
    	}

    	async function preWorkoutTimer() {
    		$$invalidate(0, timer = "Get Ready");
    		await delay(1000);
    		$$invalidate(0, timer = "Set!");
    		await delay(1000);
    		$$invalidate(0, timer = "Go!");
    		await delay(1000);
    		doSeries();
    	}

    	async function doSeries() {
    		await delay(1000);

    		for (let index = 0; index < series; index++) {
    			if (exercising == false) {
    				break;
    			}

    			console.log(`Serie ${index + 1} de ${series}`);

    			// Por cada ejercicio
    			for (let index = 0; index < exerciseAmount; index++) {
    				if (exercising == false) {
    					$$invalidate(2, mode = null);
    					break;
    				}

    				console.log(`Ejercicio ${index + 1} de ${exerciseAmount}`);

    				// Timer del ejercicio
    				$$invalidate(2, mode = "activity");

    				await exerciseTimer(exerciseTime, "activity");

    				// Timer del descanso
    				$$invalidate(2, mode = "rest");

    				exerciseTimer(restTime, "rest");
    				await delay(restTime * 1000);
    			}

    			exerciseTimer(resetTime, "reset");
    			await delay(resetTime * 1000);
    		} // Timer entre series
    	}

    	async function exerciseTimer(time, type) {
    		if (exercising == false) {
    			$$invalidate(2, mode = null);
    			return "";
    		}

    		let totalSeconds = time;

    		if (type == "activity") {
    			$$invalidate(0, timer = "Go! " + totalSeconds + " seconds left");
    		} else if (type == "rest") {
    			$$invalidate(0, timer = "Rest for " + totalSeconds + " seconds");
    		}

    		for (let index = 0; index < time; index++) {
    			if (exercising == false) {
    				$$invalidate(2, mode = null);
    				break;
    			}

    			if (type == "activity" && exercising == true) {
    				$$invalidate(0, timer = "Go! " + totalSeconds + " seconds left");
    				totalSeconds--;
    				await delay(1000);
    			} else if (type == "rest" && exercising == true) {
    				$$invalidate(0, timer = "Rest for " + totalSeconds + " seconds");
    				totalSeconds--;
    				await delay(1000);
    			} else if (type == "reset" && exercising == true) {
    				$$invalidate(0, timer = totalSeconds + " seconds until next series");
    				totalSeconds--;
    				await delay(1000);
    			}
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Form,
    		Timer,
    		exerciseTime,
    		exerciseAmount,
    		series,
    		restTime,
    		resetTime,
    		timer,
    		exercising,
    		mode,
    		delay,
    		start,
    		cancel,
    		preWorkoutTimer,
    		doSeries,
    		exerciseTimer
    	});

    	$$self.$inject_state = $$props => {
    		if ("exerciseTime" in $$props) $$invalidate(3, exerciseTime = $$props.exerciseTime);
    		if ("exerciseAmount" in $$props) $$invalidate(4, exerciseAmount = $$props.exerciseAmount);
    		if ("series" in $$props) $$invalidate(5, series = $$props.series);
    		if ("restTime" in $$props) $$invalidate(6, restTime = $$props.restTime);
    		if ("resetTime" in $$props) $$invalidate(7, resetTime = $$props.resetTime);
    		if ("timer" in $$props) $$invalidate(0, timer = $$props.timer);
    		if ("exercising" in $$props) $$invalidate(1, exercising = $$props.exercising);
    		if ("mode" in $$props) $$invalidate(2, mode = $$props.mode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		timer,
    		exercising,
    		mode,
    		exerciseTime,
    		exerciseAmount,
    		series,
    		restTime,
    		resetTime,
    		start,
    		cancel
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
