/*
 describe('Service $api', function() {
 var $httpBackend;
 var $rootScope;
 var $api;
 var $localStorage;
 var $window;

 beforeEach(module('app.core'));
 beforeEach(config(function (_$apiProvider_) {
 _$apiProvider_.addModel('Test', {
 id: {
 type: 'integer',
 identifier: true
 },
 child: {
 type: '<Test>'
 }
 });
 }));

 beforeEach(inject(function (_$api_, _$httpBackend_, _$rootScope_, _$localStorage_, _$window_) {
 $api = _$api_;
 $rootScope = _$rootScope_;
 $httpBackend = _$httpBackend_;
 $localStorage = _$localStorage_;
 $window = _$window_;
 $localStorage.$reset();

 //        $api.authorization.defineRoute('/users/refresh');
 }));

 describe('httpParamSerializer', function () {
 var $httpParamSerialiser;

 beforeEach(function (_$httpParamSerializerNoEncode_) {
 $httpParamSerialiser = _$httpParamSerializerNoEncode_;
 });

 it('should format array to multiple query', function () {
 var result = $httpParamSerializer({
 data: ['test', 'test2']
 });
 expect(result).toBe('data[]=test&data[]=test2');
 });

 it('should format object to multiple query', function () {
 var result = $httpParamSerializer({
 data: {
 'test': 'test3',
 'test3': 'test'
 }
 });
 expect(result).toBe('data[test]=test3&data[test3]=test');
 });

 it('should format date', function () {
 var result = $httpParamSerializer({
 data: new Date('1993-02-08T23:00:00.000Z')
 });
 expect(result).toBe('data=1993-02-08T23:00:00.000Z');
 });

 it('should format complex object to multiple query', function () {
 var result = $api.httpParamSerializer({
 data: {
 'test': 'test3',
 'test3': [
 'data',
 {
 'test': true
 }
 ]
 }
 });
 expect(result).toBe('data[test]=test3&data[test3][]=data&data[test3][][test]=true');
 })
 });

 describe('cache', function () {
 it('should defined', function () {
 expect($api.cache).toBeDefined();
 })
 });

 describe('error', function () {
 describe('on 401', function () {
 it('should logout if not login', function () {
 var flag = false;
 $httpBackend.expectGET(/test$/).respond(401);
 $rootScope.$on('$logout', function () {
 flag = true;
 });
 $api.all('test').getList();
 expect($httpBackend.flush).not.toThrow();
 expect(flag).toBeTruthy();
 });

 it('should refresh authorization if login', function () {
 var authorization = {
 access_token: 'test',
 token_type: 'bearer',
 refresh_token: 'qsdgb',
 expires_in: 3600
 };
 authorization.plain = function () {
 return authorization;
 };

 $api.authorization.set(authorization);

 $httpBackend.expectGET(/test$/).respond(function () {
 $httpBackend.expectGET(/test$/).respond(200, []);
 return [401, ''];
 });
 $httpBackend.expectPOST(/refresh$/).respond(200, {
 access_token: "ZjFhY2U0MGRiZjZiOGM4MWUzOGZiYmQ5ZjNmYzZkMjllNWJlOTYyYjdhZTQwOTBjNjhkMzhiYmZmMjNlYmYzNA",
 expires_in: 3600,
 token_type: "bearer",
 refresh_token: "YWJhNzVjYjA4OWZiNTIzMTkzOTNhZmU3NDEyMjQ1NTM1MzNjODQ2ZmZhMDU4YTIzMjU1MzA1MmE1MTQyMWQxMg",
 user: {
 id: 1
 }
 });
 $api.all('test').getList();
 expect($httpBackend.flush).not.toThrow();
 });
 });
 });

 describe('collection', function () {

 var collection;

 beforeEach(function () {
 collection = $api.all('test')
 .all('collection');
 });

 it('should create a new element from current resource', function () {
 var element = collection.new();
 expect(element.route).toBe('collection');
 $httpBackend.expectPOST(/test\/collection$/)
 .respond(201);

 element.save();
 expect($httpBackend.flush).not.toThrow();
 });

 it('should set element toString', function () {
 collection.setToString(function (element) {
 return element.name;
 });
 var element = collection.new();
 element.name = 'test';
 expect(element.toString()).toBe('test');
 });

 it('should filter attribute', function () {
 collection.addFilterAttribute('id');
 $httpBackend.expectGET(/test\/collection\/1$/).respond(200, {
 id: 1,
 name: "test"
 });
 var element;
 collection.get(1).then(function (gotElement) {
 element = gotElement;
 });
 expect($httpBackend.flush).not.toThrow();
 expect(element.id).toBeUndefined();
 });

 it('should refresh', function () {
 $httpBackend.expectGET(/test\/collection$/).respond(200, [
 {
 id: 1,
 name: "test"
 }
 ]);
 collection.refresh();
 expect($httpBackend.flush).not.toThrow();
 expect(collection.length).toBe(1);
 });

 it('should perform pagination', function () {
 $httpBackend.expectGET(/test\/collection/)
 .respond(function (method, url, data, headers, params) {
 expect(params).toEqual({
 limit: '2',
 start: '0'
 });
 return [200, [{id: 1}, {id: 2}], {
 'Content-Range': 'collection 0-1/20'
 }];
 });

 collection.getList({
 page: 0,
 limit: 2
 }).then(function (gotCollection) {
 collection = gotCollection;
 });

 expect($httpBackend.flush).not.toThrow();
 expect(collection.totalLength).toBe(20);
 expect(collection.limit).toBe(2);
 expect(collection.page).toBe(0);
 });
 });

 describe('element', function () {
 var collection;

 beforeEach(function () {
 collection = $api.all('collection');
 element = collection.new();
 });

 it('should save', function () {
 $httpBackend.expectPOST(/collection$/).respond(201);
 var element = collection.new();
 element.save();
 expect($httpBackend.flush).not.toThrow();
 });

 it('should refresh', function () {
 $httpBackend.expectGET(/collection\/1$/).respond(200, {
 id: 1,
 name: "test"
 });
 var element;
 collection.get(1).then(function (gotElement) {
 element = gotElement;
 });
 expect($httpBackend.flush).not.toThrow();
 $httpBackend.expectGET(/collection\/1$/).respond(200, {
 id: 1,
 name: "test3"
 });
 element.refresh();
 expect($httpBackend.flush).not.toThrow();
 expect(element.name).toBe('test3');
 });
 });

 describe('users', function () {
 var $users;

 beforeEach(function () {
 $users = $api.all('users');
 });

 function loginUser() {
 $httpBackend.expectPOST(/login$/)
 .respond(200, {
 access_token: "ZjFhY2U0MGRiZjZiOGM4MWUzOGZiYmQ5ZjNmYzZkMjllNWJlOTYyYjdhZTQwOTBjNjhkMzhiYmZmMjNlYmYzNA",
 expires_in: 3600,
 token_type: "bearer",
 refresh_token: "YWJhNzVjYjA4OWZiNTIzMTkzOTNhZmU3NDEyMjQ1NTM1MzNjODQ2ZmZhMDU4YTIzMjU1MzA1MmE1MTQyMWQxMg",
 user: {
 id: 1
 }
 });
 $users.login({
 username: 'test@redkeet.com',
 password: 'test'
 });
 expect($httpBackend.flush).not.toThrow();
 $rootScope.$digest();
 }

 describe('collection', function () {
 it('should test if login', function () {
 expect($users.isLogin()).toBeFalsy();
 });

 it('should login user test', function() {
 loginUser();
 expect($users.isLogin()).toBeTruthy();
 });

 it('should exec events on login', function () {
 var flag = false;
 $rootScope.$on('$login', function () {
 flag = true;
 });
 loginUser();
 expect(flag).toBeTruthy();
 });

 it('should logout', function () {
 loginUser();
 $users.logout();
 expect($users.isLogin()).toBeFalsy();
 });

 it('shoud get user', function () {
 loginUser();
 var user = $users.me();
 expect(user.id).toBe(1);
 });

 it('should refresh authorization', function () {
 loginUser();
 $httpBackend.expectPOST(/refresh$/)
 .respond(200, {
 access_token: "ZjFhY2U0MGRiZjZiOGM4MWUzOGZiYmQ5ZjNmYzZkMjllNWJlOTYyYjdhZTQwOTBjNjhkMzhiYmZmMjNlYmYzNA",
 expires_in: 3600,
 token_type: "bearer",
 refresh_token: "YWJhNzVjYjA4OWZiNTIzMTkzOTNhZmU3NDEyMjQ1NTM1MzNjODQ2ZmZhMDU4YTIzMjU1MzA1MmE1MTQyMWQxMg",
 user: {
 id: 1
 }
 });
 $api.authorization.refresh();
 expect($httpBackend.flush).not.toThrow();
 expect($users.isLogin()).toBeTruthy();
 });

 it('should define roles', function () {
 $users.defineRoles([
 'ROLE_USER'
 ]);
 expect($users.getDefinedRoles()).toEqual([
 'ROLE_USER'
 ]);
 });

 it('should restore previous credential', function () {
 loginUser();
 $window.location.reload();
 expect($users.isLogin()).toBeTruthy();
 });
 });

 describe('element', function () {
 var user;

 beforeEach(function () {
 loginUser();
 user = $users.me();
 });

 it('should validate permission', function () {

 });

 it('should logout', function () {
 user.logout();
 expect($users.isLogin()).toBeFalsy();
 });

 it('should save user', function () {
 $httpBackend.expectPUT(/users\/1$/).
 respond(204);
 $users.me().save();
 expect($httpBackend.flush).not.toThrow();
 expect($users.me()).toEqual(jasmine.any(Object));
 });

 it('should update user settings on login', function () {
 $httpBackend.expectPUT(/users\/1$/)
 .respond(201);
 if (!angular.isObject($users.me().settings))
 $users.me().settings = {};
 if (!angular.isObject($users.me().settings.interface))
 $users.me().settings.interface = {};

 $users.me().settings.interface.animation = false;
 expect($httpBackend.flush).not.toThrow();
 $users.me().settings.interface.animation = true;
 expect($httpBackend.flush).not.toThrow();
 expect($users.me().settings.interface.animation).toBeTruthy();
 });

 it('should update user settings on already login', function () {
 $window.location.reload();
 $httpBackend.expectPUT(/users\/1$/)
 .respond(201);
 if (!angular.isObject($users.me().settings))
 $users.me().settings = {};
 if (!angular.isObject($users.me().settings.interface))
 $users.me().settings.interface = {};

 $users.me().settings.interface.animation = false;
 expect($httpBackend.flush).not.toThrow();
 $users.me().settings.interface.animation = true;
 expect($httpBackend.flush).not.toThrow();
 expect($users.me().settings.interface.animation).toBeTruthy();
 });
 });
 });
 });
 */
