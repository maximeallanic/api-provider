/**
 * Created by mallanic on 30/01/2017.
 */

angular.module('app.core')
        .run(function ($httpBackend, Config, $templateCache, $log, $window) {

            function respond(method, url, data, headers) {
                $log.info(method + ' ' + url, data, headers);

                if (method == 'PUT')
                    return [201, '', {}];
                else if (method == 'DELETE')
                    return [204, '', {}];

                url = url.replace(/^.*\/\/[^\/]+\/(app_dev\.php\/)?/, '');
                url = url.split("?")[0];
                var template = $templateCache.get('/app/fixture/' + url + '/' + method.toLowerCase() + '.json');
                if (template)
                    return [200, template, {}];

                var request = new XMLHttpRequest();
                request.open('GET', '/app/fixture/' + url + '/' + method.toLowerCase() + '.json', false);
                request.send(null);
                $templateCache.put(url, request.response);
                return [request.status, request.response, {}];
            }


            var get = $httpBackend.whenGET(/\.(html|js|json|jpg|jpeg|png|svg)$/);
            if ($window.isUnit)
                get.respond(function (method, url) {
                    var template = $templateCache.get(url);
                    return angular.isString(template) ? template : '';
                });
            else
                get.passThrough();

            $httpBackend.whenGET(/.*$/).respond(respond);
            $httpBackend.whenPOST(/.*$/).respond(respond);
            $httpBackend.whenPUT(/.*$/).respond(respond);
            $httpBackend.whenDELETE(/.*$/).respond(respond);
        });
