
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
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
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
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
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
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
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
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
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.3' }, detail), true));
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

    /**
     * Compute the dimension of the crop area based on image size and aspect ratio
     * @param {number} imgWidth width of the src image in pixels
     * @param {number} imgHeight height of the src image in pixels
     * @param {number} aspect aspect ratio of the crop
     */
    function getCropSize(imgWidth, imgHeight, aspect) {
      if (imgWidth >= imgHeight * aspect) {
        return {
          width: imgHeight * aspect,
          height: imgHeight,
        }
      }
      return {
        width: imgWidth,
        height: imgWidth / aspect,
      }
    }

    /**
     * Ensure a new image position stays in the crop area.
     * @param {{x: number, y: number}} position new x/y position requested for the image
     * @param {{width: number, height: number}} imageSize width/height of the src image
     * @param {{width: number, height: number}} cropSize width/height of the crop area
     * @param {number} zoom zoom value
     * @returns {{x: number, y: number}}
     */
    function restrictPosition(position, imageSize, cropSize, zoom) {
      return {
        x: restrictPositionCoord(position.x, imageSize.width, cropSize.width, zoom),
        y: restrictPositionCoord(position.y, imageSize.height, cropSize.height, zoom),
      }
    }

    function restrictPositionCoord(position, imageSize, cropSize, zoom) {
      const maxPosition = (imageSize * zoom) / 2 - cropSize / 2;
      return Math.min(maxPosition, Math.max(position, -maxPosition))
    }

    function getDistanceBetweenPoints(pointA, pointB) {
      return Math.sqrt(Math.pow(pointA.y - pointB.y, 2) + Math.pow(pointA.x - pointB.x, 2))
    }

    /**
     * Compute the output cropped area of the image in percentages and pixels.
     * x/y are the top-left coordinates on the src image
     * @param {{x: number, y number}} crop x/y position of the current center of the image
     * @param {{width: number, height: number, naturalWidth: number, naturelHeight: number}} imageSize width/height of the src image (default is size on the screen, natural is the original size)
     * @param {{width: number, height: number}} cropSize width/height of the crop area
     * @param {number} aspect aspect value
     * @param {number} zoom zoom value
     * @param {boolean} restrictPosition whether we should limit or not the cropped area
     */
    function computeCroppedArea(crop, imgSize, cropSize, aspect, zoom, restrictPosition = true) {
      const limitAreaFn = restrictPosition ? limitArea : noOp;
      const croppedAreaPercentages = {
        x: limitAreaFn(
          100,
          (((imgSize.width - cropSize.width / zoom) / 2 - crop.x / zoom) / imgSize.width) * 100
        ),
        y: limitAreaFn(
          100,
          (((imgSize.height - cropSize.height / zoom) / 2 - crop.y / zoom) / imgSize.height) * 100
        ),
        width: limitAreaFn(100, ((cropSize.width / imgSize.width) * 100) / zoom),
        height: limitAreaFn(100, ((cropSize.height / imgSize.height) * 100) / zoom),
      };

      // we compute the pixels size naively
      const widthInPixels = limitAreaFn(
        imgSize.naturalWidth,
        (croppedAreaPercentages.width * imgSize.naturalWidth) / 100,
        true
      );
      const heightInPixels = limitAreaFn(
        imgSize.naturalHeight,
        (croppedAreaPercentages.height * imgSize.naturalHeight) / 100,
        true
      );
      const isImgWiderThanHigh = imgSize.naturalWidth >= imgSize.naturalHeight * aspect;

      // then we ensure the width and height exactly match the aspect (to avoid rounding approximations)
      // if the image is wider than high, when zoom is 0, the crop height will be equals to iamge height
      // thus we want to compute the width from the height and aspect for accuracy.
      // Otherwise, we compute the height from width and aspect.
      const sizePixels = isImgWiderThanHigh
        ? {
            width: Math.round(heightInPixels * aspect),
            height: heightInPixels,
          }
        : {
            width: widthInPixels,
            height: Math.round(widthInPixels / aspect),
          };
      const croppedAreaPixels = {
        ...sizePixels,
        x: limitAreaFn(
          imgSize.naturalWidth - sizePixels.width,
          (croppedAreaPercentages.x * imgSize.naturalWidth) / 100,
          true
        ),
        y: limitAreaFn(
          imgSize.naturalHeight - sizePixels.height,
          (croppedAreaPercentages.y * imgSize.naturalHeight) / 100,
          true
        ),
      };
      return { croppedAreaPercentages, croppedAreaPixels }
    }

    /**
     * Ensure the returned value is between 0 and max
     * @param {number} max
     * @param {number} value
     * @param {boolean} shouldRound
     */
    function limitArea(max, value, shouldRound = false) {
      const v = shouldRound ? Math.round(value) : value;
      return Math.min(max, Math.max(0, v))
    }

    function noOp(max, value) {
      return value
    }

    /**
     * Return the point that is the center of point a and b
     * @param {{x: number, y: number}} a
     * @param {{x: number, y: number}} b
     */
    function getCenter(a, b) {
      return {
        x: (b.x + a.x) / 2,
        y: (b.y + a.y) / 2,
      }
    }

    var helpers = /*#__PURE__*/Object.freeze({
        __proto__: null,
        getCropSize: getCropSize,
        restrictPosition: restrictPosition,
        getDistanceBetweenPoints: getDistanceBetweenPoints,
        computeCroppedArea: computeCroppedArea,
        getCenter: getCenter
    });

    /* node_modules/svelte-easy-crop/src/index.svelte generated by Svelte v3.44.3 */

    const { Error: Error_1, window: window_1 } = globals;
    const file$2 = "node_modules/svelte-easy-crop/src/index.svelte";

    // (250:2) {#if cropperSize}
    function create_if_block$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "cropperArea svelte-12kodkg");
    			set_style(div, "width", /*cropperSize*/ ctx[7].width + "px");
    			set_style(div, "height", /*cropperSize*/ ctx[7].height + "px");
    			attr_dev(div, "data-testid", "cropper");
    			toggle_class(div, "round", /*cropShape*/ ctx[3] === 'round');
    			toggle_class(div, "grid", /*showGrid*/ ctx[4]);
    			add_location(div, file$2, 250, 4, 6735);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*cropperSize*/ 128) {
    				set_style(div, "width", /*cropperSize*/ ctx[7].width + "px");
    			}

    			if (dirty[0] & /*cropperSize*/ 128) {
    				set_style(div, "height", /*cropperSize*/ ctx[7].height + "px");
    			}

    			if (dirty[0] & /*cropShape*/ 8) {
    				toggle_class(div, "round", /*cropShape*/ ctx[3] === 'round');
    			}

    			if (dirty[0] & /*showGrid*/ 16) {
    				toggle_class(div, "grid", /*showGrid*/ ctx[4]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(250:2) {#if cropperSize}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let t;
    	let mounted;
    	let dispose;
    	let if_block = /*cropperSize*/ ctx[7] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(img, "class", "image svelte-12kodkg");
    			if (!src_url_equal(img.src, img_src_value = /*image*/ ctx[2])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			set_style(img, "transform", "translate(" + /*crop*/ ctx[1].x + "px, " + /*crop*/ ctx[1].y + "px) scale(" + /*zoom*/ ctx[0] + ")");
    			attr_dev(img, "crossorigin", /*crossOrigin*/ ctx[5]);
    			add_location(img, file$2, 240, 2, 6508);
    			attr_dev(div, "class", "container svelte-12kodkg");
    			attr_dev(div, "data-testid", "container");
    			add_location(div, file$2, 230, 0, 6234);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			/*img_binding*/ ctx[25](img);
    			append_dev(div, t);
    			if (if_block) if_block.m(div, null);
    			/*div_binding*/ ctx[26](div);

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "resize", /*computeSizes*/ ctx[10], false, false, false),
    					listen_dev(window_1, "mousemove", /*onMouseMove*/ ctx[12], false, false, false),
    					listen_dev(window_1, "mouseup", /*onDragStopped*/ ctx[15], true, false, false),
    					listen_dev(window_1, "touchmove", prevent_default(/*onTouchMove*/ ctx[14]), { passive: false }, true, false),
    					listen_dev(window_1, "touchend", /*onDragStopped*/ ctx[15], false, false, false),
    					listen_dev(img, "load", /*onImgLoad*/ ctx[9], false, false, false),
    					listen_dev(div, "mousedown", prevent_default(/*onMouseDown*/ ctx[11]), false, true, false),
    					listen_dev(div, "touchstart", prevent_default(/*onTouchStart*/ ctx[13]), false, true, false),
    					listen_dev(div, "wheel", prevent_default(/*onWheel*/ ctx[16]), false, true, false),
    					listen_dev(div, "gesturestart", prevent_default(/*gesturestart_handler*/ ctx[23]), false, true, false),
    					listen_dev(div, "gesturechange", prevent_default(/*gesturechange_handler*/ ctx[24]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*image*/ 4 && !src_url_equal(img.src, img_src_value = /*image*/ ctx[2])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*crop, zoom*/ 3) {
    				set_style(img, "transform", "translate(" + /*crop*/ ctx[1].x + "px, " + /*crop*/ ctx[1].y + "px) scale(" + /*zoom*/ ctx[0] + ")");
    			}

    			if (dirty[0] & /*crossOrigin*/ 32) {
    				attr_dev(img, "crossorigin", /*crossOrigin*/ ctx[5]);
    			}

    			if (/*cropperSize*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*img_binding*/ ctx[25](null);
    			if (if_block) if_block.d();
    			/*div_binding*/ ctx[26](null);
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
    	validate_slots('Src', slots, []);
    	let { image } = $$props;
    	let { crop = { x: 0, y: 0 } } = $$props;
    	let { zoom = 1 } = $$props;
    	let { aspect = 4 / 3 } = $$props;
    	let { minZoom = 1 } = $$props;
    	let { maxZoom = 3 } = $$props;
    	let { cropSize = null } = $$props;
    	let { cropShape = 'rect' } = $$props;
    	let { showGrid = true } = $$props;
    	let { zoomSpeed = 1 } = $$props;
    	let { crossOrigin = null } = $$props;
    	let { restrictPosition: restrictPosition$1 = true } = $$props;
    	let cropperSize = null;

    	let imageSize = {
    		width: 0,
    		height: 0,
    		naturalWidth: 0,
    		naturalHeight: 0
    	};

    	let containerEl = null;
    	let containerRect = null;
    	let imgEl = null;
    	let dragStartPosition = { x: 0, y: 0 };
    	let dragStartCrop = { x: 0, y: 0 };
    	let lastPinchDistance = 0;
    	let rafDragTimeout = null;
    	let rafZoomTimeout = null;
    	let isDragging = false;
    	let dispatch = createEventDispatcher();

    	onMount(() => {
    		// when rendered via SSR, the image can already be loaded and its onLoad callback will never be called
    		if (imgEl && imgEl.complete) {
    			onImgLoad();
    		}
    	});

    	onDestroy(() => {
    		dispatch = null;
    	});

    	const onImgLoad = () => {
    		computeSizes();
    		emitCropData();
    	};

    	const getAspect = () => {
    		if (cropSize) {
    			return cropSize.width / cropSize.height;
    		}

    		return aspect;
    	};

    	const computeSizes = () => {
    		if (imgEl) {
    			imageSize = {
    				width: imgEl.width,
    				height: imgEl.height,
    				naturalWidth: imgEl.naturalWidth,
    				naturalHeight: imgEl.naturalHeight
    			};

    			$$invalidate(7, cropperSize = cropSize
    			? cropSize
    			: getCropSize(imgEl.width, imgEl.height, aspect));
    		}

    		if (containerEl) {
    			containerRect = containerEl.getBoundingClientRect();
    		}
    	};

    	const getMousePoint = e => ({
    		x: Number(e.clientX),
    		y: Number(e.clientY)
    	});

    	const getTouchPoint = touch => ({
    		x: Number(touch.clientX),
    		y: Number(touch.clientY)
    	});

    	const onMouseDown = e => {
    		isDragging = true;
    		onDragStart(getMousePoint(e));
    	};

    	const onMouseMove = e => {
    		if (!isDragging) {
    			return;
    		}

    		onDrag(getMousePoint(e));
    	};

    	const onTouchStart = e => {
    		if (e.touches.length === 2) {
    			onPinchStart(e);
    		} else if (e.touches.length === 1) {
    			onDragStart(getTouchPoint(e.touches[0]));
    		}
    	};

    	const onTouchMove = e => {
    		isDragging = true;

    		// Prevent whole page from scrolling on iOS.
    		if (e.touches.length === 2) {
    			onPinchMove(e);
    		} else if (e.touches.length === 1) {
    			onDrag(getTouchPoint(e.touches[0]));
    		}
    	};

    	const onDragStart = ({ x, y }) => {
    		dragStartPosition = { x, y };
    		dragStartCrop = { x: crop.x, y: crop.y };
    	};

    	const onDrag = ({ x, y }) => {
    		if (rafDragTimeout) window.cancelAnimationFrame(rafDragTimeout);

    		rafDragTimeout = window.requestAnimationFrame(() => {
    			if (x === undefined || y === undefined) return;
    			const offsetX = x - dragStartPosition.x;
    			const offsetY = y - dragStartPosition.y;

    			const requestedPosition = {
    				x: dragStartCrop.x + offsetX,
    				y: dragStartCrop.y + offsetY
    			};

    			$$invalidate(1, crop = restrictPosition$1
    			? restrictPosition(requestedPosition, imageSize, cropperSize, zoom)
    			: requestedPosition);
    		});
    	};

    	const onDragStopped = () => {
    		isDragging = false;
    		emitCropData();
    	};

    	const onPinchStart = e => {
    		const pointA = getTouchPoint(e.touches[0]);
    		const pointB = getTouchPoint(e.touches[1]);
    		lastPinchDistance = getDistanceBetweenPoints(pointA, pointB);
    		onDragStart(getCenter(pointA, pointB));
    	};

    	const onPinchMove = e => {
    		const pointA = getTouchPoint(e.touches[0]);
    		const pointB = getTouchPoint(e.touches[1]);
    		const center = getCenter(pointA, pointB);
    		onDrag(center);
    		if (rafZoomTimeout) window.cancelAnimationFrame(rafZoomTimeout);

    		rafZoomTimeout = window.requestAnimationFrame(() => {
    			const distance = getDistanceBetweenPoints(pointA, pointB);
    			const newZoom = zoom * (distance / lastPinchDistance);
    			setNewZoom(newZoom, center);
    			lastPinchDistance = distance;
    		});
    	};

    	const onWheel = e => {
    		const point = getMousePoint(e);
    		const newZoom = zoom - e.deltaY * zoomSpeed / 200;
    		setNewZoom(newZoom, point);
    	};

    	const getPointOnContainer = ({ x, y }) => {
    		if (!containerRect) {
    			throw new Error('The Cropper is not mounted');
    		}

    		return {
    			x: containerRect.width / 2 - (x - containerRect.left),
    			y: containerRect.height / 2 - (y - containerRect.top)
    		};
    	};

    	const getPointOnImage = ({ x, y }) => ({
    		x: (x + crop.x) / zoom,
    		y: (y + crop.y) / zoom
    	});

    	const setNewZoom = (newZoom, point) => {
    		const zoomPoint = getPointOnContainer(point);
    		const zoomTarget = getPointOnImage(zoomPoint);
    		$$invalidate(0, zoom = Math.min(maxZoom, Math.max(newZoom, minZoom)));

    		const requestedPosition = {
    			x: zoomTarget.x * zoom - zoomPoint.x,
    			y: zoomTarget.y * zoom - zoomPoint.y
    		};

    		$$invalidate(1, crop = restrictPosition$1
    		? restrictPosition(requestedPosition, imageSize, cropperSize, zoom)
    		: requestedPosition);
    	};

    	const emitCropData = () => {
    		if (!cropperSize || cropperSize.width === 0) return;

    		// this is to ensure the crop is correctly restricted after a zoom back (https://github.com/ricardo-ch/svelte-easy-crop/issues/6)
    		const position = restrictPosition$1
    		? restrictPosition(crop, imageSize, cropperSize, zoom)
    		: crop;

    		const { croppedAreaPercentages, croppedAreaPixels } = computeCroppedArea(position, imageSize, cropperSize, getAspect(), zoom, restrictPosition$1);

    		dispatch('cropcomplete', {
    			percent: croppedAreaPercentages,
    			pixels: croppedAreaPixels
    		});
    	};

    	const writable_props = [
    		'image',
    		'crop',
    		'zoom',
    		'aspect',
    		'minZoom',
    		'maxZoom',
    		'cropSize',
    		'cropShape',
    		'showGrid',
    		'zoomSpeed',
    		'crossOrigin',
    		'restrictPosition'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Src> was created with unknown prop '${key}'`);
    	});

    	function gesturestart_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function gesturechange_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function img_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			imgEl = $$value;
    			$$invalidate(6, imgEl);
    		});
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			containerEl = $$value;
    			$$invalidate(8, containerEl);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('image' in $$props) $$invalidate(2, image = $$props.image);
    		if ('crop' in $$props) $$invalidate(1, crop = $$props.crop);
    		if ('zoom' in $$props) $$invalidate(0, zoom = $$props.zoom);
    		if ('aspect' in $$props) $$invalidate(17, aspect = $$props.aspect);
    		if ('minZoom' in $$props) $$invalidate(18, minZoom = $$props.minZoom);
    		if ('maxZoom' in $$props) $$invalidate(19, maxZoom = $$props.maxZoom);
    		if ('cropSize' in $$props) $$invalidate(20, cropSize = $$props.cropSize);
    		if ('cropShape' in $$props) $$invalidate(3, cropShape = $$props.cropShape);
    		if ('showGrid' in $$props) $$invalidate(4, showGrid = $$props.showGrid);
    		if ('zoomSpeed' in $$props) $$invalidate(21, zoomSpeed = $$props.zoomSpeed);
    		if ('crossOrigin' in $$props) $$invalidate(5, crossOrigin = $$props.crossOrigin);
    		if ('restrictPosition' in $$props) $$invalidate(22, restrictPosition$1 = $$props.restrictPosition);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		onDestroy,
    		createEventDispatcher,
    		helpers,
    		image,
    		crop,
    		zoom,
    		aspect,
    		minZoom,
    		maxZoom,
    		cropSize,
    		cropShape,
    		showGrid,
    		zoomSpeed,
    		crossOrigin,
    		restrictPosition: restrictPosition$1,
    		cropperSize,
    		imageSize,
    		containerEl,
    		containerRect,
    		imgEl,
    		dragStartPosition,
    		dragStartCrop,
    		lastPinchDistance,
    		rafDragTimeout,
    		rafZoomTimeout,
    		isDragging,
    		dispatch,
    		onImgLoad,
    		getAspect,
    		computeSizes,
    		getMousePoint,
    		getTouchPoint,
    		onMouseDown,
    		onMouseMove,
    		onTouchStart,
    		onTouchMove,
    		onDragStart,
    		onDrag,
    		onDragStopped,
    		onPinchStart,
    		onPinchMove,
    		onWheel,
    		getPointOnContainer,
    		getPointOnImage,
    		setNewZoom,
    		emitCropData
    	});

    	$$self.$inject_state = $$props => {
    		if ('image' in $$props) $$invalidate(2, image = $$props.image);
    		if ('crop' in $$props) $$invalidate(1, crop = $$props.crop);
    		if ('zoom' in $$props) $$invalidate(0, zoom = $$props.zoom);
    		if ('aspect' in $$props) $$invalidate(17, aspect = $$props.aspect);
    		if ('minZoom' in $$props) $$invalidate(18, minZoom = $$props.minZoom);
    		if ('maxZoom' in $$props) $$invalidate(19, maxZoom = $$props.maxZoom);
    		if ('cropSize' in $$props) $$invalidate(20, cropSize = $$props.cropSize);
    		if ('cropShape' in $$props) $$invalidate(3, cropShape = $$props.cropShape);
    		if ('showGrid' in $$props) $$invalidate(4, showGrid = $$props.showGrid);
    		if ('zoomSpeed' in $$props) $$invalidate(21, zoomSpeed = $$props.zoomSpeed);
    		if ('crossOrigin' in $$props) $$invalidate(5, crossOrigin = $$props.crossOrigin);
    		if ('restrictPosition' in $$props) $$invalidate(22, restrictPosition$1 = $$props.restrictPosition);
    		if ('cropperSize' in $$props) $$invalidate(7, cropperSize = $$props.cropperSize);
    		if ('imageSize' in $$props) imageSize = $$props.imageSize;
    		if ('containerEl' in $$props) $$invalidate(8, containerEl = $$props.containerEl);
    		if ('containerRect' in $$props) containerRect = $$props.containerRect;
    		if ('imgEl' in $$props) $$invalidate(6, imgEl = $$props.imgEl);
    		if ('dragStartPosition' in $$props) dragStartPosition = $$props.dragStartPosition;
    		if ('dragStartCrop' in $$props) dragStartCrop = $$props.dragStartCrop;
    		if ('lastPinchDistance' in $$props) lastPinchDistance = $$props.lastPinchDistance;
    		if ('rafDragTimeout' in $$props) rafDragTimeout = $$props.rafDragTimeout;
    		if ('rafZoomTimeout' in $$props) rafZoomTimeout = $$props.rafZoomTimeout;
    		if ('isDragging' in $$props) isDragging = $$props.isDragging;
    		if ('dispatch' in $$props) dispatch = $$props.dispatch;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*imgEl, cropSize, aspect*/ 1179712) {
    			// ------ Reactive statement ------
    			//when aspect changes, we reset the cropperSize
    			if (imgEl) {
    				$$invalidate(7, cropperSize = cropSize
    				? cropSize
    				: getCropSize(imgEl.width, imgEl.height, aspect));
    			}
    		}

    		if ($$self.$$.dirty[0] & /*zoom*/ 1) {
    			// when zoom changes, we recompute the cropped area
    			zoom && emitCropData();
    		}
    	};

    	return [
    		zoom,
    		crop,
    		image,
    		cropShape,
    		showGrid,
    		crossOrigin,
    		imgEl,
    		cropperSize,
    		containerEl,
    		onImgLoad,
    		computeSizes,
    		onMouseDown,
    		onMouseMove,
    		onTouchStart,
    		onTouchMove,
    		onDragStopped,
    		onWheel,
    		aspect,
    		minZoom,
    		maxZoom,
    		cropSize,
    		zoomSpeed,
    		restrictPosition$1,
    		gesturestart_handler,
    		gesturechange_handler,
    		img_binding,
    		div_binding
    	];
    }

    class Src extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$2,
    			create_fragment$2,
    			safe_not_equal,
    			{
    				image: 2,
    				crop: 1,
    				zoom: 0,
    				aspect: 17,
    				minZoom: 18,
    				maxZoom: 19,
    				cropSize: 20,
    				cropShape: 3,
    				showGrid: 4,
    				zoomSpeed: 21,
    				crossOrigin: 5,
    				restrictPosition: 22
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Src",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*image*/ ctx[2] === undefined && !('image' in props)) {
    			console.warn("<Src> was created without expected prop 'image'");
    		}
    	}

    	get image() {
    		throw new Error_1("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set image(value) {
    		throw new Error_1("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get crop() {
    		throw new Error_1("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set crop(value) {
    		throw new Error_1("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get zoom() {
    		throw new Error_1("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set zoom(value) {
    		throw new Error_1("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get aspect() {
    		throw new Error_1("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set aspect(value) {
    		throw new Error_1("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get minZoom() {
    		throw new Error_1("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set minZoom(value) {
    		throw new Error_1("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get maxZoom() {
    		throw new Error_1("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxZoom(value) {
    		throw new Error_1("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cropSize() {
    		throw new Error_1("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cropSize(value) {
    		throw new Error_1("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cropShape() {
    		throw new Error_1("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cropShape(value) {
    		throw new Error_1("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showGrid() {
    		throw new Error_1("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showGrid(value) {
    		throw new Error_1("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get zoomSpeed() {
    		throw new Error_1("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set zoomSpeed(value) {
    		throw new Error_1("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get crossOrigin() {
    		throw new Error_1("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set crossOrigin(value) {
    		throw new Error_1("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restrictPosition() {
    		throw new Error_1("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restrictPosition(value) {
    		throw new Error_1("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * @author Valentin Hervieu
     * https://codesandbox.io/s/y09komm059?file=/src/canvasUtils.js 
     */

     const createImage = (url) =>
     new Promise((resolve, reject) => {
       const image = new Image();
       image.addEventListener('load', () => resolve(image));
       image.addEventListener('error', (error) => reject(error));
       image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
       image.src = url;
     });

    function getRadianAngle(degreeValue) {
     return (degreeValue * Math.PI) / 180
    }

    /**
    * This function was adapted from the one in the ReadMe of https://github.com/DominicTobias/react-image-crop
    * @param {File} image - Image File url
    * @param {Object} pixelCrop - pixelCrop Object provided by react-easy-crop
    * @param {number} rotation - optional rotation parameter
    */
    async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
     const image = await createImage(imageSrc);
     const canvas = document.createElement('canvas');
     const ctx = canvas.getContext('2d');

     const maxSize = Math.max(image.width, image.height);
     const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

     // set each dimensions to double largest dimension to allow for a safe area for the
     // image to rotate in without being clipped by canvas context
     canvas.width = safeArea;
     canvas.height = safeArea;

     // translate canvas context to a central location on image to allow rotating around the center.
     ctx.translate(safeArea / 2, safeArea / 2);
     ctx.rotate(getRadianAngle(rotation));
     ctx.translate(-safeArea / 2, -safeArea / 2);

     // draw rotated image and store data.
     ctx.drawImage(
       image,
       safeArea / 2 - image.width * 0.5,
       safeArea / 2 - image.height * 0.5
     );
     const data = ctx.getImageData(0, 0, safeArea, safeArea);

     // set canvas width to final desired crop size - this will clear existing context
     canvas.width = pixelCrop.width;
     canvas.height = pixelCrop.height;

     // paste generated rotate image with correct offsets for x,y crop values.
     ctx.putImageData(
       data,
       Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
       Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
     );

     // As Base64 string
     // return canvas.toDataURL('image/jpeg');

     // As a blob
     return new Promise((resolve) => {
       canvas.toBlob((file) => {
         resolve(URL.createObjectURL(file));
       }, 'image/png');
     })
    }

    /* src/Components/upload-files/upload-files.svelte generated by Svelte v3.44.3 */
    const file$1 = "src/Components/upload-files/upload-files.svelte";

    // (48:2) {:else}
    function create_else_block(ctx) {
    	let h20;
    	let t1;
    	let div0;
    	let cropper;
    	let t2;
    	let h21;
    	let t4;
    	let div1;
    	let img;
    	let img_src_value;
    	let t5;
    	let t6;
    	let button;
    	let current;
    	let mounted;
    	let dispose;

    	cropper = new Src({
    			props: {
    				image: /*image*/ ctx[0],
    				aspect: 1,
    				zoom: "1",
    				crop: { x: 0, y: 0 }
    			},
    			$$inline: true
    		});

    	cropper.$on("cropcomplete", /*previewCrop*/ ctx[7]);

    	function select_block_type_1(ctx, dirty) {
    		if (/*croppedImage*/ ctx[3]) return create_if_block_1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			h20 = element("h2");
    			h20.textContent = "Sanjog Easy Crop";
    			t1 = space();
    			div0 = element("div");
    			create_component(cropper.$$.fragment);
    			t2 = space();
    			h21 = element("h2");
    			h21.textContent = "Preview";
    			t4 = space();
    			div1 = element("div");
    			img = element("img");
    			t5 = space();
    			if_block.c();
    			t6 = space();
    			button = element("button");
    			button.textContent = "Start over?";
    			add_location(h20, file$1, 48, 6, 1448);
    			set_style(div0, "position", "relative");
    			set_style(div0, "width", "100%");
    			set_style(div0, "height", "50%");
    			add_location(div0, file$1, 49, 6, 1480);
    			add_location(h21, file$1, 58, 6, 1735);
    			attr_dev(img, "class", "prof-pic svelte-7pjtwe");
    			if (!src_url_equal(img.src, img_src_value = /*image*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Profile example");
    			attr_dev(img, "style", /*style*/ ctx[6]);
    			add_location(img, file$1, 60, 10, 1799);
    			attr_dev(div1, "class", "prof-pic-wrapper svelte-7pjtwe");
    			add_location(div1, file$1, 59, 6, 1758);
    			attr_dev(button, "type", "button");
    			add_location(button, file$1, 77, 6, 2303);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div0, anchor);
    			mount_component(cropper, div0, null);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			/*img_binding*/ ctx[12](img);
    			insert_dev(target, t5, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, button, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*reset*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const cropper_changes = {};
    			if (dirty & /*image*/ 1) cropper_changes.image = /*image*/ ctx[0];
    			cropper.$set(cropper_changes);

    			if (!current || dirty & /*image*/ 1 && !src_url_equal(img.src, img_src_value = /*image*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(t6.parentNode, t6);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(cropper.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(cropper.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h20);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div0);
    			destroy_component(cropper);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(h21);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div1);
    			/*img_binding*/ ctx[12](null);
    			if (detaching) detach_dev(t5);
    			if_block.d(detaching);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(48:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (39:2) {#if !image}
    function create_if_block(ctx) {
    	let h20;
    	let t1;
    	let input;
    	let t2;
    	let h21;
    	let t4;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h20 = element("h2");
    			h20.textContent = "Upload a picture for cropping?";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			h21 = element("h2");
    			h21.textContent = "Or... use this cute dog 🐕";
    			t4 = space();
    			button = element("button");
    			button.textContent = "Click me!";
    			add_location(h20, file$1, 39, 6, 1118);
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", ".jpg, .jpeg, .png");
    			add_location(input, file$1, 42, 6, 1182);
    			add_location(h21, file$1, 43, 6, 1293);
    			attr_dev(button, "type", "button");
    			add_location(button, file$1, 46, 6, 1353);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input, anchor);
    			/*input_binding*/ ctx[10](input);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*change_handler*/ ctx[9], false, false, false),
    					listen_dev(button, "click", /*click_handler*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h20);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[10](null);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(h21);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(39:2) {#if !image}",
    		ctx
    	});

    	return block;
    }

    // (75:6) {:else}
    function create_else_block_1(ctx) {
    	let br;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			br = element("br");
    			button = element("button");
    			button.textContent = "Crop!";
    			add_location(br, file$1, 75, 6, 2166);
    			attr_dev(button, "type", "button");
    			add_location(button, file$1, 75, 10, 2170);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, br, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[13], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(75:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (69:6) {#if croppedImage}
    function create_if_block_1(ctx) {
    	let h2;
    	let t1;
    	let img;
    	let img_src_value;
    	let br;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Cropped Output";
    			t1 = space();
    			img = element("img");
    			br = element("br");
    			add_location(h2, file$1, 69, 10, 2021);
    			if (!src_url_equal(img.src, img_src_value = /*croppedImage*/ ctx[3])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Cropped profile");
    			add_location(img, file$1, 70, 10, 2055);
    			add_location(br, file$1, 73, 12, 2141);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, img, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*croppedImage*/ 8 && !src_url_equal(img.src, img_src_value = /*croppedImage*/ ctx[3])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(img);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(69:6) {#if croppedImage}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*image*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
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
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
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
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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

    const defaultSrc = "https://cdn1-www.dogtime.com/assets/uploads/2011/03/puppy-development.jpg";

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Upload_files', slots, []);
    	let image, fileinput, pixelCrop, croppedImage;

    	function onFileSelected(e) {
    		let imageFile = e.target.files[0];
    		let reader = new FileReader();

    		reader.onload = e => {
    			$$invalidate(0, image = e.target.result);
    		};

    		reader.readAsDataURL(imageFile);
    	}

    	let profilePicture, style;

    	function previewCrop(e) {
    		$$invalidate(2, pixelCrop = e.detail.pixels);
    		const { x, y, width } = e.detail.pixels;
    		const scale = 200 / width;
    		$$invalidate(4, profilePicture.style = `margin: ${-y * scale}px 0 0 ${-x * scale}px; width: ${profilePicture.naturalWidth * scale}px;`, profilePicture);
    	}

    	async function cropImage() {
    		$$invalidate(3, croppedImage = await getCroppedImg(image, pixelCrop));
    	}

    	function reset() {
    		$$invalidate(3, croppedImage = null);
    		$$invalidate(0, image = null);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Upload_files> was created with unknown prop '${key}'`);
    	});

    	const change_handler = e => onFileSelected(e);

    	function input_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			fileinput = $$value;
    			$$invalidate(1, fileinput);
    		});
    	}

    	const click_handler = () => {
    		$$invalidate(0, image = defaultSrc);
    	};

    	function img_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			profilePicture = $$value;
    			$$invalidate(4, profilePicture);
    		});
    	}

    	const click_handler_1 = async () => {
    		$$invalidate(3, croppedImage = await getCroppedImg(image, pixelCrop));
    	};

    	$$self.$capture_state = () => ({
    		Cropper: Src,
    		getCroppedImg,
    		image,
    		fileinput,
    		pixelCrop,
    		croppedImage,
    		defaultSrc,
    		onFileSelected,
    		profilePicture,
    		style,
    		previewCrop,
    		cropImage,
    		reset
    	});

    	$$self.$inject_state = $$props => {
    		if ('image' in $$props) $$invalidate(0, image = $$props.image);
    		if ('fileinput' in $$props) $$invalidate(1, fileinput = $$props.fileinput);
    		if ('pixelCrop' in $$props) $$invalidate(2, pixelCrop = $$props.pixelCrop);
    		if ('croppedImage' in $$props) $$invalidate(3, croppedImage = $$props.croppedImage);
    		if ('profilePicture' in $$props) $$invalidate(4, profilePicture = $$props.profilePicture);
    		if ('style' in $$props) $$invalidate(6, style = $$props.style);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		image,
    		fileinput,
    		pixelCrop,
    		croppedImage,
    		profilePicture,
    		onFileSelected,
    		style,
    		previewCrop,
    		reset,
    		change_handler,
    		input_binding,
    		click_handler,
    		img_binding,
    		click_handler_1
    	];
    }

    class Upload_files extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Upload_files",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.44.3 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let p;
    	let t4;
    	let a;
    	let t6;
    	let t7;
    	let uploadfiles;
    	let current;
    	uploadfiles = new Upload_files({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text("Hello ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = text("!");
    			t3 = space();
    			p = element("p");
    			t4 = text("Visit the ");
    			a = element("a");
    			a.textContent = "Svelte tutorial";
    			t6 = text(" to learn how to build Svelte apps.");
    			t7 = space();
    			create_component(uploadfiles.$$.fragment);
    			attr_dev(h1, "class", "svelte-1tky8bj");
    			add_location(h1, file, 6, 1, 120);
    			attr_dev(a, "href", "https://svelte.dev/tutorial");
    			add_location(a, file, 7, 14, 157);
    			add_location(p, file, 7, 1, 144);
    			attr_dev(main, "class", "svelte-1tky8bj");
    			add_location(main, file, 5, 0, 112);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(main, t3);
    			append_dev(main, p);
    			append_dev(p, t4);
    			append_dev(p, a);
    			append_dev(p, t6);
    			append_dev(main, t7);
    			mount_component(uploadfiles, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(uploadfiles.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(uploadfiles.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(uploadfiles);
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
    	validate_slots('App', slots, []);
    	let { name } = $$props;
    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ name, UploadFiles: Upload_files });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !('name' in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
