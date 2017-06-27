/*
 * Copyright 2017 Elkya <https://elkya.com/>
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic at 16/6/2017
 */

(function () {
    'use strict';

    angular
            .module('app.core.api', [])
            .provider('$api', apiProvider);

    function apiProvider($httpProvider) {
        $httpProvider.defaults.useXDomain = true;
        delete $httpProvider.defaults.headers.common['X-Requested-With'];

        var $apiProvider = new ApiProvider();

        /* Provide Moment integration */
        if (_.isFunction(moment)) {
            $apiProvider.addType('date', {
                check: function (value, onRequest) {
                    return onRequest ? moment.isMoment(value) : moment(value).isValid();
                },
                transform: function (value, onRequest) {
                    if (moment.isMoment(value) && onRequest)
                        return value.toISOString();
                    else if (angular.isString(value) && onRequest)
                        return value;
                    else if (angular.isString(value) && !onRequest)
                        return moment(value);
                    return undefined;
                }
            });
        }

        $apiProvider.$get = function ($injector, $http, $q, $log, $httpParamSerializerNoEncode) {
            $apiProvider.defineInjector($injector.invoke);

            $apiProvider.defineHttpMethod(function (config) {
                config.paramSerializer = $httpParamSerializerNoEncode;
                return $http(config);
            });

            $apiProvider.definePromise($q.defer);

            $apiProvider.defineLog($log);

            ApiProvider.generateDefinition($apiProvider);

            return $apiProvider.$transform();
        };
        return $apiProvider;
    }
})();
