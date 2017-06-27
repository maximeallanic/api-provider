/*
 * Copyright 2017 Elkya <https://elkya.com/>
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic at 4/5/2017
 */

_.mixin({
    'mapObject' : function(objectToMap, keys, fn) {
        objectToMap = _.pick(objectToMap, _.keys(keys));
        _.each(keys, function (field, key) {
            var o = fn(objectToMap[key], key, field);
            if (_.isUndefined(o)
                || o.key !== key
                || _.isUndefined(o.value))
                delete objectToMap[key];

            if (_.isObject(o)
                && !_.isUndefined(o.value))
                objectToMap[o.key] = o.value;
        });
        return objectToMap;
    }
});

/*eslint no-unused-vars: "off"*/
/**
 * ApiProvider
 * @return {BaseProvider}
 * @constructor
 */
function ApiProvider() {

    var $inject = function () {
        throw new Error('Define an Injector')
    };

    var $http = function () {
        throw new Error('Define an http Requester')
    };

    var $defer = function () {
        throw new Error('Define a Deferrer');
    };

    var $log = console;

    ModelProvider.model = {};

    ModelProvider.type = {
        integer: {
            check: function (value) {
                return _.isNumber(value);
            }
        },
        string: {
            check: function (value) {
                return _.isString(value);
            }
        },
        object: {
            check: function (value) {
                return _.isObject(value);
            }
        },
        date: {
            check: function (value, onRequest) {
                return onRequest ? _.isDate(value): _.isString(value);
            },
            transform: function (value, onRequest) {
                if (_.isDate(value) && onRequest)
                    return value.toISOString();
                else if (_.isString(value) && onRequest)
                    return value;
                else if (_.isString(value) && !onRequest)
                    return new Date(value);
                return undefined;
            }
        },
        boolean: {
            check: function (value) {
                return _.isBoolean(value);
            }
        }
    };

    /**
     * ModelProvider
     * @param {object} fields
     * @param {string|ModelProvider} inherited Name of Model to Inherit
     *
     * @method check(value, entity)
     * @method transform(value, onRequest, entity)
     * @public identifier
     * @public onlyIdentifier
     * @public default
     * @public onlyGet
     *
     * @return {transform}
     * @namespace ModelProvider
     * @constructor
     */
    function ModelProvider(fields, inherited) {
        var modelProvider = this;
        var methods = {
            toString: function ($log, Element) {
                return function () {
                    $log.error('Please define toString for ', Element);
                    return '';
                };
            }
        };
        var events = {};

        /**
         * Get Inherited ModelProvider
         * @return {ModelProvider}
         */
        modelProvider.getInherited = function () {
            if (_.isObject(inherited))
                return inherited;

            return ModelProvider.model[inherited];
        };

        /**
         * Get Object that define Fields
         * @return {Object}
         */
        modelProvider.getFields = function () {
            var inheritedModel = modelProvider.getInherited();
            if (_.isObject(inheritedModel))
                return _.merge(fields, inheritedModel.getFields());
            return fields;
        };

        /**
         * Add a Field to Model
         * @param name
         * @param definition
         * @return {transform}
         */
        modelProvider.addField = function (name, definition) {
            fields[name] = definition;
            return modelProvider;
        };

        /**
         * Get all Method available in this model
         * @return {Object}
         */
        modelProvider.getMethods = function () {
            var inheritedModel = modelProvider.getInherited();
            return _.isObject(inheritedModel)
                    ? _.assignIn({}, inheritedModel.getMethods(), methods)
                    : methods;
        };

        /**
         * Get all Event available in this model
         * @return {Object}
         */
        modelProvider.getEvents = function (eventName) {
            var inheritedModel = modelProvider.getInherited();
            if (_.isString(eventName) && _.isObject(inheritedModel))
                return _.concat(events[eventName] || [],
                        _.isObject(inheritedModel) ? inheritedModel.getEvents(eventName) : []);
            else if (_.isObject(inheritedModel))
                return _.merge(events, inheritedModel.getEvents());
            else if (_.isString(eventName))
                return events[eventName] || [];
            return events;
        };

        /**
         * Add Method to a model
         * @name addMethod
         * @param name Name of Method without $ at begin
         * @param fn A Function that executed in injector
         * @return {transform}
         * @memberof ModelProvider
         */
        modelProvider.addMethod = function (name, fn) {
            methods['$' + name] = fn;
            return modelProvider;
        };

        /**
         * Add a Method which it capture an event
         * @name on
         * @param eventName Name of event to Capture
         * @param fn A Function that executed in injector
         * @return {transform}
         * @memberof ModelProvider
         */
        modelProvider.on = function (eventName, fn) {
            if (!_.isArray(events[eventName]))
                events[eventName] = [];

            fn.origin = modelProvider;
            events[eventName].push(fn);
            return modelProvider;
        };

        /**
         * Define Method that execute when Model is transformed to String
         * @param {function} fn A Function that executed in injector
         * @return {transform}
         * @memberof ModelProvider
         */
        modelProvider.setToString = function (fn) {
            methods.toString = function (Element) {
                return function () {
                    return fn(Element);
                };
            };
            return modelProvider;
        };

        modelProvider.$transform = function (element, config) {
            if (_.isUndefined(config))
                config = {
                    method: 'GET'
                };

            if (_.isNil(element))
                return undefined;

            if (_.isObject(element.$model)
                && config.method === 'GET')
                return element;

            // Transform Object
            element = _.mapObject(element, modelProvider.getFields(), function transform(value, key, field) {
                // Transform null v
                if (_.isNull(value))
                    value = undefined;

                // Set only on method selected
                if ((_.isString(field.only)
                        && field.only !== config.method)
                    || (config.method !== 'GET'
                        && field.onlyGet))
                    value = undefined;

                // Transform value array
                else if (field.type.search(/^<(.*)>$/) !== -1
                        && _.isArray(value)) {
                    var f = _.clone(field);
                    f.type = field.type.match(/^<(.*)>$/)[1];

                    value = _.map(value, function (arrayValue) {

                        // Tranform field
                        var result = transform(arrayValue, key, f);
                        if (_.isObject(result) && !_.isNil(result.value))
                            return result.value;
                        return undefined;
                    });
                }

                // Transform value model
                else if (_.isObject(ModelProvider.model[field.type])) {
                    if (_.isObject(value)
                            && field.onlyIdentifier
                            && config.method !== 'GET')
                        value = value.$id;
                    else
                        value = ModelProvider.model[field.type].$transform(value, config);
                }

                // Transform value type
                else if (_.isObject(ModelProvider.type[field.type])) {

                    // Check value type
                    if (_.isFunction(ModelProvider.type[field.type].check)
                            && !ModelProvider.type[field.type].check(value, config.method !== 'GET'))
                        value = undefined;

                    // Transform value type
                    if (_.isFunction(ModelProvider.type[field.type].transform))
                        value = ModelProvider.type[field.type].transform(value, config.method !== 'GET');
                }

                // Transform value is necessary
                if (_.isFunction(field.transform))
                    value = field.transform(value, config.method !== 'GET');

                // Set default value if not set
                if (_.isNil(value) && field.default)
                    value = field.default;

                return {
                    key: (field.identifier && config.method === 'GET') ? '$id' : key,
                    value: (field.identifier && config.method !== 'GET') ? element.$id : value
                };
            });

            if (config.method === 'GET') {
                // Define all methods
                _.each(modelProvider.getMethods(), function (fn, name) {
                    element[name] = $inject(fn, modelProvider, {
                        Element: element
                    });
                });

                element.$model = modelProvider;
            }
            return element;
        };

        return modelProvider;
    }

    /**
     * @constructor
     * @param {string} path Path to access from url
     * @param {BaseProvider} [parent] Parent Provider
     * @param {BaseProvider} [inherit] Inherited Provider
     * @param {string} [name=path] Name of BaseProvider
     */
    function BaseProvider(path, parent, inherit, name) {
        var base = this;

        if (!_.isString(path))
            return $log.error('Define a path for this provider', base);

        base.path = path;
        base.name = _.isString(name) ? name : path;
        base.url = _.isObject(parent) ? parent.url + '/' + base.path : base.path;
        base.methods = {};
        base.requestMethods = {};
        base.providerMethod = {};

        var children = [];
        var events = _.isObject(parent) ? _.cloneDeep(parent.getEvents(true)) : {};

        if (_.isObject(inherit) && inherit.url === base.url)
            return $log.error('Provider doesn\'t inherit from itself');

        /**
         * On
         * @param eventName
         * @param fn
         * @param isGlobal
         * @return {BaseProvider}
         */
        base.on = function (eventName, fn, isGlobal) {
            if (_.isArray(eventName))
                _.each(eventName, function (event) {
                    base.on(event, fn, isGlobal);
                });
            else {
                fn.global = isGlobal || false;
                fn.origin = base.name;
                if (!_.isArray(events[eventName]))
                    events[eventName] = [];
                events[eventName].push(fn);
            }
            return base;
        };

        /**
         * Get path string to obtain route
         * @return {string}
         */
        base.getPathName = function () {
            var path = base.path.replace('/', '');
            if (!_.isUndefined(parent) && !_.isNil(parent.getPathName()))
                return [parent.getPathName(), path].join('.');
            return path.length > 0 ? path : undefined;
        };

        /**
         * Add a children resource
         * @param {String} path Path to make request
         * @param {ModelProvider|String} entity
         * @param {BaseProvider} [inherit] Provider to inherit event, method
         * @param {String} [name=path] Name of Route accessible in parent object
         * @return {ResourceProvider}
         */
        base.addResource = function (path, entity, inherit, name) {
            var newChildren = new ResourceProvider(path, entity, base, inherit, name);
            children.push(newChildren);
            return newChildren;
        };

        /**
         * Return parent of this resource
         * @return {BaseProvider}
         */
        base.getParent = function () {
            return parent;
        };

        /**
         * Add a simple route children
         * @param {String} path Path to make request
         * @param {BaseProvider} [inherit] Provider to inherit event, method
         * @param {String} [name=path] Name of Route accessible in parent object
         * @return {RouteProvider}
         */
        base.addRoute = function (path, inherit, name) {
            var newChildren = new RouteProvider(path, base, inherit, name);
            children.push(newChildren);
            return newChildren;
        };

        //if (_.isUndefined(ModelProvider.providerMethod))
            //ModelProvider.providerMethod = {};

        // Inherit from Parent
        if (_.isObject(parent))
            _.forEach(parent.providerMethod, function (fn, name) {
                base.addProviderMethod(name, fn);
            });

        // Inherit
        if (_.isObject(base.inherited))
            _.forEach(base.inherited.providerMethod, function (fn, name) {
                base.addProviderMethod(name, fn);
            });

        /**
         * @name base.addMethod
         * @param name {string} Name of Method without $ at begin
         * @param fn {function} Function that return function
         * @example
         * @return {BaseProvider}
         */
        base.addMethod = function (name, fn) {

            base.methods[name] = function (locals) {
                return $inject(fn, base, locals);
            };
            base.methods[name].origin = base.name;

            return base;
        };

        /**
         * Get Inherited ModelProvider
         * @return {BaseProvider}
         */
        base.getInherited = function () {
            return inherit;
        };

        /**
         * Get all Method available in this model
         * @return {Object}
         */
        base.getMethods = function () {
            var inherited = base.getInherited();
            return _.assignIn(_.isObject(inherited) ? inherited.getMethods() : {}, base.methods);
        };

        /**
         * Get all Event available in this model
         * @return {Object}
         */
        base.getEvents = function (eventName, isGlobal) {
            if (_.isBoolean(eventName))
                isGlobal = eventName;

            if (_.isUndefined(isGlobal))
                isGlobal = false;

            var baseEvents = events;
            if (_.isString(eventName)) {
                baseEvents = baseEvents[eventName] || [];
                if (isGlobal)
                    baseEvents = _.filter(baseEvents, 'global');
            }
            else if (isGlobal)
                baseEvents = _.mapValues(baseEvents, function (e) {
                    return _.filter(e, 'global');
                });

            return baseEvents;
        };

        /**
         * @deprecated
         * use addMethod with method $custom
         * @name base.addRequestMethod
         * @param name name of Request Method without $ at begin
         * @param fn function return params
         * @return {BaseProvider}
         */
        base.addRequestMethod = function (name, fn) {
            base.requestMethods[name] = function (locals) {
                return $inject(fn, base, locals);
            };
            return base;
        };

        base.getRequestMethods = function () {
            var inherited = base.getInherited();
            if (_.isObject(inherited))
                return _.assign(inherited.getRequestMethods(), base.requestMethods);
            return base.requestMethods;
        };

        /**
         * Get Children Resource/Route
         * @return {BaseProvider[]}
         */
        base.getChildren = function () {
            var inherited = base.getInherited();
            if (_.isObject(inherited))
                return _.uniqBy(_.concat(children, inherited.getChildren()).filter(function (child) {
                    return child.url !== base.url;
                }), 'name');
            return children;
        };

        /**
         * @name base.getProvider
         * @param path Path or Name of Provider
         * @return {*}
         */
        base.getProvider = function (path) {
            if (_.isString(path))
                path = path.split('.');
            var children = base.getChildren().filter(function (children) {
                return children.name === path[0];
            })[0];
            if (_.isUndefined(children))
                throw Error('Provider ' + path[0] + ' doesn\'t exist');
            if (path.length > 1)
                return children.getProvider(path.splice(1));
            return children;
        };

        base.permissions = base.getPathName();

        /**
         * Define a permissions
         * @param permissions.create {string} Permission name to create entity
         * @param permissions.edit {string} Permission name to edit entity
         * @param permissions.delete {string} Permission name to delete entity
         * @param permissions.list {string} Permission name to list entities
         * @param permissions.view {string} Permission name to view entity
         */
        base.setPermissions = function (permissions) {
            base.permissions = _.assign(base.permissions, permissions);
            return base;
        };

        // Transform Element
        base.$transform = function generate(element, globalEvents) {

            var elementEvents = _.isObject(globalEvents) ? _.clone(globalEvents) : {};
            // If not defined set to object
            if (_.isUndefined(element))
                element = {};

            function getElementEvents(eventName, isGlobal) {
                if (_.isBoolean(eventName))
                    isGlobal = eventName;
                if (_.isUndefined(isGlobal))
                    isGlobal = false;


                var baseEvents = elementEvents;
                if (_.isString(eventName)) {
                    baseEvents = baseEvents[eventName] || [];
                    if (isGlobal)
                        baseEvents = _.filter(baseEvents, 'global');
                }
                else if (isGlobal)
                    _.mapValues(baseEvents, function (e) {
                        return _.filter(e, 'global');
                    });

                return baseEvents;
            }

            /**
             * Emit an event
             * @name element.$emit
             * @param {String} eventName Name of event to emit
             * @return {*}
             */
            function emit(eventName) {
                var accumulator = element;

                if (_.isArray(eventName)) {
                    var emitArguments = Array.from(arguments).splice(1);
                    _.each(eventName, function (eventN) {
                        accumulator = emit.apply(null, [eventN].concat(emitArguments));
                        return accumulator;
                    });
                    return accumulator;
                }

                var eventsEmitted = _.concat(getElementEvents(eventName), base.getEvents(eventName));

                var functionArguments = [element].concat(Array.from(arguments).splice(1));

                // Dispatch route event
                _.each(eventsEmitted, function (event) {
                    try {
                        accumulator = $inject(event, base, {
                            Element: element,
                            Previous: accumulator,
                            ElementEvents: getElementEvents
                        }).apply(null, functionArguments);
                        return accumulator;
                    } catch (e) {
                        $log.error(e);
                    }
                });
                return accumulator;
            }

            element = emit('beforeElementTransformed', element, getElementEvents) || element;
            if (_.isObject(element.$provider))
                return element;

            // Manage Events

            element.$on = function (eventName, fn, isGlobal) {
                if (_.isArray(eventName))
                    return _.each(eventName, function (event) {
                        return element.$on(event, fn, isGlobal);
                    });

                if (_.isUndefined(isGlobal))
                    isGlobal = false;

                fn.global = isGlobal;
                fn.element = true;

                if (!_.isArray(elementEvents[eventName]))
                    elementEvents[eventName] = [];
                elementEvents[eventName].push(fn);
            };

            element.$emit = emit;

            element.$toPlain = function () {

                var tmpElement = {};

                // If is List
                if (_.isArray(element))
                    tmpElement = _.map(element, function (e) {
                        return _.isFunction(e.$toPlain) ? e.$toPlain() : e;
                    });
                // If is object
                else
                    _.each(element, function (value, key) {
                        if (key.indexOf('$') === 0
                                && key !== '$id')
                            return ;
                        tmpElement[key.indexOf('$') !== 0 ? key : _.replace(key, /^\$/, '')] = _.isArray(value) ? value.map(function (v) {
                            return !_.isNil(v) && _.isFunction(v.$toPlain) ? v.$toPlain() : v;
                        }) : (!_.isNil(value) && _.isFunction(value.$toPlain) ? value.$toPlain() : value);
                    });

                //tmpElement.$path = base.getPathName();
                return tmpElement;
            };

            // Deprecated
            _.each(base.getRequestMethods(), function (requestMethod, name) {
                element['$' + name] = function currentRequest() {

                    var deferred = $defer();

                    var baseEventName = name.toUpperCaseFirst();

                    try {
                        var config = requestMethod({
                            Element: element
                        }).apply(null, arguments);
                    } catch (e) {
                        return $log.error(e)
                    }

                    /** Set Default Config **/

                    config = _.extend({
                        url: base.url,
                        method: 'GET',
                        data: undefined,
                        params: {},
                        headers: {},
                        uploadEventHandlers: {
                            progress: function (e) {
                                if (e.lengthComputable)
                                    deferred.notify({
                                        type: 'progress',
                                        event: e
                                    });
                            }
                        }
                    }, config);

                    (function makeRequest() {
                        if (element.$emit(['beforeRequest', 'before' + baseEventName], config, deferred, makeRequest)) {
                            $http(config).then(function (response) {
                                /** On Success **/
                                if (element.$emit(['afterRequest', 'after' + baseEventName], response, deferred, element.$emit, makeRequest)) {
                                    if (_.isString(response.data)
                                            && response.data.length === 0)
                                        response.data = {};

                                    if (!_.isString(response.data))
                                        response.data.$headers = response.headers;
                                    deferred.resolve(response.data);
                                }
                            }).catch(function (error) {
                                /** On Error **/
                                if (element.$emit(['afterRequestError', 'after' + baseEventName + 'Error'], error, deferred, element.$emit, makeRequest))
                                    deferred.reject(error);
                            });
                        }
                        return deferred.promise;
                    })();

                    return deferred.promise;
                }
            });

            // Define Method
            _.each(base.getMethods(), function (fn, name) {
                element['$' + name] = fn({
                    Element: element,
                    ElementEvents: getElementEvents(true)
                });
            });

            element.$provider = base;

            element.$emit('elementTransformed', element);

            /** Declare Resource **/
            _.each(base.getChildren(), function (routeProvider) {
                element[routeProvider.name] = routeProvider.$transform(element[routeProvider.name] || [], getElementEvents(true));
            });

            return element;
        };
    }

    function RouteProvider(path, parent, inherit, name) {
        var route = new BaseProvider(path, parent, inherit, name);

        route.addRequestMethod('custom', function () {
            var resource = this;
            return function (path, config) {
                return _.extend({
                    url: resource.url + path
                }, config)
            };
        });

        route.addRequestMethod('post', function () {
            return function (data, params, headers, config) {
                return _.extend({
                    method: 'POST',
                    data: data,
                    params: params,
                    headers: headers
                }, config || {});
            };
        });

        route.addRequestMethod('get', function () {
            return function (params, headers, config) {
                return _.extend({
                    method: 'GET',
                    params: params,
                    headers: headers
                }, config || {});
            };
        });

        route.addRequestMethod('put', function () {
            return function (data, params, headers) {
                return {
                    method: 'PUT',
                    data: data,
                    params: params,
                    headers: headers
                };
            };
        });

        route.addRequestMethod('patch', function () {
            return function (data, params, headers) {
                return {
                    method: 'PATCH',
                    data: data,
                    params: params,
                    headers: headers
                };
            };
        });

        route.addRequestMethod('delete', function () {
            return function (data, params, headers) {
                return {
                    method: 'DELETE',
                    data: data,
                    params: params,
                    headers: headers
                };
            };
        });

        return route;
    }

    /** Resource Provider Definition ***/
    function ResourceProvider(path, model, parent, inherit, name) {
        var resourceProvider = new RouteProvider(path, parent, inherit, name);

        resourceProvider.elementProvider = new RouteProvider(path + '/:id' + path, parent, !_.isUndefined(inherit) ? inherit.elementProvider : undefined);

        resourceProvider.setRouteRewriting = function (fn) {
            resourceProvider.elementProvider.on('beforeElementTransformed', function () {
                return function (element) {
                    var route = $inject(fn, resourceProvider, {})(element);
                    if (_.isUndefined(route))
                        return element;

                    return route.$new(element);
                }
            });
        };

        /**
         * Get Associated Model
         * @return {ModelProvider}
         */
        resourceProvider.getModel = function () {
            if (_.isObject(model))
                return model;
            return ModelProvider.model[model];
        };

        // Surcharge getEvents to add Model events
        var getEvents = resourceProvider.getEvents;
        resourceProvider.getEvents = function (eventName, isGlobal) {
            if (resourceProvider.getModel() && !isGlobal)
                return (_.isString(eventName) ? _.concat : _.merge)(resourceProvider.getModel().getEvents(eventName), getEvents(eventName, isGlobal));
            return getEvents(eventName, isGlobal);
        };

        resourceProvider.elementProvider.getPathName = resourceProvider.getPathName;

        // Define permissions
        var pathName = resourceProvider.getPathName();

        resourceProvider.permissions = {
            list: pathName + '.list',
            create: pathName + '.create',
            edit: pathName + '.edit',
            view: pathName + '.view',
            delete: pathName + '.delete'
        };

        resourceProvider.elementProvider.permissions = resourceProvider.permissions;

        resourceProvider.on('beforeElementTransformed', function () {
            return function (element, list, getElementEvents) {
                element = element.map(function (value) {
                    return resourceProvider.elementProvider.$transform(value, getElementEvents(true));
                });
                element.$model = resourceProvider.getModel();
                return element;
            }
        });

        resourceProvider.elementProvider.on('beforeElementTransformed', function () {
            return function (element) {
                if (!_.isNil(resourceProvider.getModel()))
                    return resourceProvider.getModel().$transform(element, {
                        method: 'GET'
                    });
                return element;
            }
        });

        resourceProvider.elementProvider.on('elementTransformed', function () {
            return function (element) {
                element.$on('beforeRequest', function () {
                    return function (subElement, request) {
                        request.url = request.url.replace(':id' + path, element.$id);
                        if (resourceProvider.getInherited())
                            request.url = request.url.replace(':id' + resourceProvider.getInherited().path, element.$id);
                        return true;
                    }
                }, true);
            }
        });

        // Transform data before sending data on Put and Post
        resourceProvider.elementProvider.on(['beforePut', 'beforePost'], function () {
            return function (element, request) {
                if (resourceProvider.getModel())
                    request.data = resourceProvider.getModel().$transform(request.data, request);
                else
                    request.data = element.$toPlain();
                return true;
            };
        });

        /**
         * Add a method to collection
         * @param {String} name Name of collection method without $ at start
         * @param {Function} fn
         * @return {BaseProvider}
         */
        resourceProvider.addCollectionMethod = function (name, fn) {
            return resourceProvider.addMethod(name, fn);
        };

        /**
         * Add a method to all elements of collection
         * @param {String} name
         * @param {Function} fn
         * @return {ResourceProvider}
         */
        resourceProvider.addElementMethod = function (name, fn) {
            resourceProvider.elementProvider.addMethod(name, fn);
            return resourceProvider;
        };

        /**
         * Add a method collection with request management
         * @deprecated
         * @param {String} name
         * @param {Function} fn
         * @return {BaseProvider}
         */
        resourceProvider.addCollectionRequestMethod = function (name, fn) {
            return resourceProvider.addRequestMethod(name, fn);
        };

        /**
         * Add a method element with request management
         * @deprecated
         * @param {String} name
         * @param {Function} fn
         * @return {ResourceProvider}
         */
        resourceProvider.addElementRequestMethod = function (name, fn) {
            resourceProvider.elementProvider.addRequestMethod(name, fn);
            return resourceProvider;
        };

        /**
         * Add Resource Children to Element
         * @param path
         * @param entity
         * @param inherit
         * @param name
         * @return {ResourceProvider}
         */
        resourceProvider.addElementResource = function (path, entity, inherit, name) {
            return resourceProvider.elementProvider.addResource(path, entity, inherit, name);
        };

        /**
         * Add Route Children to Element
         * @param {String} path
         * @param {BaseProvider} parent
         * @param {BaseProvider} inherit
         * @param name
         * @return {RouteProvider}
         */
        resourceProvider.addElementRoute = function (path, inherit, name) {
            return resourceProvider.elementProvider.addRoute(path, inherit, name);
        };

        // Add Method $getList to collection
        resourceProvider.addCollectionRequestMethod('getList', function () {
            return function (params, headers) {
                return {
                    method: 'GET',
                    params: params,
                    headers: headers
                };
            };
        });

        // Add Method $get to collection
        resourceProvider.addCollectionRequestMethod('get', function () {
            var resource = this;
            return function (id, params, headers) {
                return {
                    url: resource.url + '/' + id,
                    method: 'GET',
                    params: params,
                    headers: headers
                };
            };
        });

        // Add Method $new to collection, to create a new element
        resourceProvider.addCollectionMethod('new', function (Element, ElementEvents) {
            var resource = this;
            return function (o) {
                return resource.elementProvider.$transform(o || {}, ElementEvents);
            };
        });

        // Add Method $refresh to refresh collection
        resourceProvider.addCollectionMethod('refresh', function (Element) {
            return function (params, headers) {
                var promise = Element.$getList(params, headers);
                promise.then(function (collections) {
                    Element.clear();
                    collections.map(function (data) {
                        Element.push(data);
                    });
                    //_.copy(collections, Element);
                });
                return promise;
            };
        });

        // Add Method $refresh to refresh element
        resourceProvider.addElementMethod('refresh', function (Element) {
            return function (params, headers) {
                var deferred = $defer();
                var promise = Element.$get(params, headers);
                promise.then(function (element) {
                    _.forEach(element, function (value, key) {
                        if (key.match(/^\$/) == null)
                            Element[key] = value;
                    });
                    deferred.resolve(Element);
                }, deferred.reject);
                return deferred.promise;
            }
        });

        // Add Method $put to element resource
        resourceProvider.addElementRequestMethod('put', function (Element) {
            return function (params, headers) {
                return {
                    method: 'PUT',
                    data: Element,
                    params: params,
                    headers: headers
                };
            };
        });

        // Add Method $delete to element resource
        resourceProvider.addElementRequestMethod('delete', function () {
            return function (params, headers) {
                return {
                    method: 'DELETE',
                    data: undefined,
                    params: params,
                    headers: headers
                };
            };
        });

        // Add Method $post to element resource
        resourceProvider.addElementRequestMethod('post', function (Element) {
            return function (params, headers, config) {
                return _.extend({
                    url: resourceProvider.url,
                    method: 'POST',
                    data: Element,
                    params: params,
                    headers: headers
                }, config || {});
            };
        });

        // Add Method $save to element resource
        resourceProvider.addElementMethod('save', function (Element) {
            return function (params, headers) {
                if (_.isUndefined(Element.$id))
                    return Element.$post(params, headers);
                else
                    return Element.$put(params, headers);
            };
        });

        // Transform data on after get element
        resourceProvider.elementProvider.on('afterGet', function (ElementEvents) {
            return function (element, response) {
                response.data = resourceProvider.elementProvider.$transform(response.data, ElementEvents(true));
                return true;
            };
        });

        // Transform data on after get element
        resourceProvider.on('afterGet', function (ElementEvents) {
            return function (element, response) {
                response.data = resourceProvider.elementProvider.$transform(response.data, ElementEvents(true));
                return true;
            };
        });

        // Transform data on after get list
        resourceProvider.on('afterGetList', function (Element, ElementEvents) {
            return function (element, response) {
                response.data = resourceProvider.$transform(response.data, ElementEvents(true));

                if (response.headers('Content-Range')) {
                    var match = response.headers('Content-Range').match(/(?:([a-z]+)\s+)?([0-9]+)-([0-9]+)\/([0-9]+)/);
                    response.data.totalLength = parseInt(match[4]);
                    response.data.limit = match[3] - match[2] + 1;
                    response.data.totalPage = Math.ceil(match[4] / response.data.limit);
                    response.data.page = Math.floor(match[2] / response.data.limit) + 1;
                }
                return true;
            };
        });

        return resourceProvider;
    }


    var $apiProvider = new BaseProvider('/');

    /**
     * Add a provider method for all BaseProvider
     * @param name
     * @param fn
     * @returns {BaseProvider}
     */
    $apiProvider.addProviderMethod = function (name, fn) {
        BaseProvider.prototype[name] = fn;
        return $apiProvider;
    };

    /**
     * Add a Method to Model Provider
     * @param name
     * @param fn
     * @return {BaseProvider}
     */
    $apiProvider.addModelProviderMethod = function (name, fn) {
        ModelProvider.prototype[name] = fn;
        return $apiProvider;
    };

    /**
     * Add a Model
     * @param {string} name Name of Model
     * @param {Object} model Object that representing the Model
     * @param {string} inherit Name of Model that inherit
     * @return {*}
     */
    $apiProvider.addModel = function (name, model, inherit) {
        ModelProvider.model[name] = new ModelProvider(model, inherit);
        return ModelProvider.model[name];
    };

    $apiProvider.getModel = function (name) {
        if (_.isString(name))
            return ModelProvider.model[name];
        return ModelProvider.model;
    };

    /**
     * Add a Custom type
     * @param type
     * @param definition
     * @return {*}
     */
    $apiProvider.addType = function (type, definition) {
        ModelProvider.type[type] = definition;
        return definition;
    };

    /**
     * Define base url for this ApiProvider
     * @param url
     * @return {BaseProvider}
     */
    $apiProvider.setBaseUrl = function (url) {
        $apiProvider.base = url;
        $apiProvider.url = url;
        return $apiProvider;
    };

    /**
     * Define Injector for your Event
     * Argument of function:
     *  - method to invoke
     *  - locals to add to invoker
     *  - this use in method
     *  - arguments variable
     * @param {Function} injector
     */
    $apiProvider.defineInjector = function (injector) {
        $inject = function (fn, base, locals) {
            var result = _.attempt(function () {
                return injector(fn, base, locals);
            });
            if (_.isError(result))
                $log.error(result);
            else
                return result;
        };
        return $apiProvider;
    };

    /**
     * Define The Http Method use to make request
     * @param {Function} http
     */
    $apiProvider.defineHttpMethod = function (http) {
        $http = http;
        return $apiProvider;
    };

    /**
     * Define the Defer Method use to defer request
     * @param {Function} defer
     */
    $apiProvider.definePromise = function (defer) {
        $defer = defer;
        return $apiProvider;
    };

    /**
     * Define the Log Objects Method. It should have warning, log and error method with first argument, message.
     * By default, it use console of browser
     * @param {Function} log.warn
     * @param {Function} log.log
     * @param {Function} log.error
     * @param {Function} log.info
     * @return {BaseProvider}
     */
    $apiProvider.defineLog = function (log) {
        $log = log;
        return $apiProvider;
    };

    /**
     * @deprecated
     * @param eventName
     * @param fn
     * @return {BaseProvider}
     */
    $apiProvider.onGlobal = function (eventName, fn) {
        $log.warn('onGlobal is deprecated, please use method "on"');
        return $apiProvider.on(eventName, fn, true);
    };

    return $apiProvider;
}

(function () {
    var paths = [];

    ApiProvider.setDefinition = function (path, fn) {
        fn.path = path;
        paths.push(fn);
    };

    ApiProvider.generateDefinition = function (ApiProvider, isClient, Injector) {
        paths = _.sortBy(paths, function (v) {
           return v.path;
        }, ['desc']);
        var base = {
            models: {}
        };
        _.each(paths, function (value) {
            Injector(value, ApiProvider, {
                ApiProvider: ApiProvider,
                isClient: isClient,
                base: base
            });
        });
        return base;
    };


})();
