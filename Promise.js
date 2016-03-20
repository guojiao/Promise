(function(global, UNDEFINED){
	'use strict';

	//Promise states
	var PENDING = 'pending';
	var FULFILLED = 'resolved';
	var REJECTED = 'rejected';

	/**
	 * utils 
	 */

	//*
	var enumerableTest = { toString: 1 };
	var enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable',
                       'toLocaleString', 'toString', 'constructor'];
    
    for(var key in enumerableTest){
    	enumerables = null;
    }

	//check the fn is a function or not 
	function isFunction(fn){
		return 'function' === (typeof fn);
	}

	function toString(obj){
		var toString = Object.prototype.toString;
		return toString.call(obj).toLowerCase();
	}

	function hasOwn(obj){
		var hasOwn = Object.prototype.hasOwnProperty;
		return hasOwn.call(obj);
	}

	//check Promise's thenable feature
	function isThenale(obj){
		return !!obj && isFunction(obj['then']);
	}

	function isArray(obj){
		return obj && '[object array]' === toString(obj);
	}

	function isDate(obj){
		return obj && '[object date]' === toString(obj);
	}

	function isObject(obj){
		return obj && '[object object]' === toString(obj);
	}


	function clone(target){
		var destObj, i, ln;

		if(target === null || target === undefined){
			return target;
		}

		//DOM Nodes
		if(target.nodeType && target.cloneNode){
			return target.cloneNode(true);
		}

		if(isDate(target)){
			return new Date(target.getTime());
		}

		if(isArray(target)){
			destObj = [];
			ln = target.length;
			while(ln > 0){
				destObj[ln] = clone(target[ln]);
			}
		}else if(isObject(target) && target.constructor === Object){
			destObj =  {};
			for(var prop in target){
				/*
				if(hasOwn(prop)){
					destObj[prop] = clone(target[prop]);
				}
				*/
				destObj[prop] = clone(target[prop]);
			}

			if(enumerables){
				for(var index in enumerables){
					destObj[enumerables[index]] = target[enumerables[index]];
				}
			}
		}
		return destObj || target;
	}
 	
 	// */
 
	//definition of Promise
	function Promise(resolver){
		//resolver should be a funciton with 2 params
		if(!isFunction(resolver)/*|| resolver.length < 2*/){
			throw new TypeError('Promise resolver undefined is not a function');
		}

		if(!(this instanceof Promise)){
			return new Promise(resolver);
		}

		var promiseValue = UNDEFINED;
		var promiseReason = UNDEFINED;
		var fulfilledFns = [];
		var rejectedFns = [];
		var promiseStatus = PENDING;
		var throwEr = true;		
		var self = this;
		var defaultError = new Error();

		this._getValue = function(){
			'use strict';

			if(REJECTED === promiseStatus){
				return promiseReason;
			}
			return promiseValue;
		};

		this._addFulfilledFn = function(fn){
			'use strict';

			fulfilledFns.push(fn);
		};

		this._addRejectedFn = function(fn){
			'use strict';

			rejectedFns.push(fn);
		};

		this._getStatus = function(){
			'use strict';

			return promiseStatus;
		};

		this._chargeError = function(){
			'use strict';

			throwEr = false;
		};

		function resolveFn(value){
			'use strict';

			if(PENDING !== promiseStatus){
				return;
			}

			var callback = null;

			promiseValue = value;
			promiseStatus = FULFILLED;

			while(!!(callback = fulfilledFns.shift())){
				callback.call(null, value);
			}
		}

		function rejectFn(reason){
			'use strict';

			if(PENDING !== promiseStatus){
				return;
			}

			var callback = null;

			promiseReason = reason;
			promiseStatus = REJECTED;

			//a rejected promise, don't have function to resolve it, should throw a 'Error'. 
			if(throwEr){
				if(reason instanceof Error){
					throw reason;
				}else{
					throw defaultError;
				}
			}

			while(!!(callback = rejectedFns.shift())){
				callback.call(null, reason);
			}
		}

		//run after the 'then' method invoked
		function handler(fn, value){
			'use strict';

			setTimeout(function(){
				fn.call(null, value);
			},0);
		}

		//execute resolver
		try{
			resolver(function(value){
				handler(resolveFn, value);
			}, function(reason){
				handler(rejectFn, reason);
			});
		}catch(e){
			handler(rejectFn, e);
		}
	}

	Promise.prototype.then = function(onFulfilled, onRejected){
		'use strict';

		var self = this,
			status = self._getStatus(),
			promiseValue = self._getValue(),
			returnValue = UNDEFINED;

		if(isFunction(onRejected)){
			self._chargeError();
		}

		//invoke the onFulfilled & onRejected method ,get Error or other value
		function getNewValue(fn, value){
			var rValue = UNDEFINED;
			try{
				rValue = isFunction(fn) ? fn.call(null, value) : value;
			}catch(e){
				rValue = e;
			}
			return rValue;
		}

		return new Promise(function(resolve, reject){

			function handler(value, fn){
				if(value instanceof Error){
					reject(value);
				}else if(isThenale(value)){
					//if the 'return-value' of the 'then' function is a promise, when the state of 'returned promise' in the list:
					//1、if the promise's state is pending, the new promise will be pending util promise is fulfilled or rejected
					//2、if the promise's state is fulfilled, the new promise will fulfilled by the value of promise
					//3、if the promise's state is rejected, the new promise will rejected by the reasion of promise
					value.then(function(value){
						resolve(value);
					}, function(reason){
						reject(reason)
					});
				}else{
					//if the 'return-value' of the 'then' function is not a error、thenanle-object，fulfilled the new promise with it
					resolve(value);
				}
			}

			function callback(value){
				var rValue = getNewValue(onFulfilled, value);
				handler(rValue);
			}

			function errorCallback(reason){
				var rValue = getNewValue(onRejected, reason);
				handler(rValue);
			}

			if(PENDING === status){ //add fulfilledFns & rejectedFns
				self._addFulfilledFn(callback);
				self._addRejectedFn(errorCallback);
			}else if(FULFILLED === status){ //invoke the fulfilledFns with promise's unchanged value
				callback(promiseValue);
			}else if(REJECTED === status){ //invoke the rejectedFns with promise's unchanged value
				errorCallback(promiseValue);
			}
		});
	};

	Promise.prototype.caught = Promise.prototype['catch'] = function(onReject){
		'use strict';

		return this.then(null, onReject);
	};

	Promise.prototype.done = function(onFulfilled, onRejected){
		'use strict';

		this.then(onFulfilled, onRejected);
	}


	Promise.all = function(promises){
		'use strict';

		var resolvedCount = 0,
			resultArray = [],
			i = 0, ln, promise;

		return new Promise(function(resolve, reject){
			if(!! isArray(Promises)){
				//reject(throw new TypeError('Promise.all need a array of Promise!'));
				throw new TypeError('Promise.all need a array of Promise!');
			}

			ln = promises.length;

			for(;i < ln; i++){
				promise = promises[i];
				if(isThenale(promise)){
					promise.then(function(value){
						resolvedCount++;
						resultArray.push(value);
						if(resolvedCount === ln){
							resolve(resultArray);
						}
					},function(reason){
						reject(reason);
					});
				}else{
					resolvedCount++;
					resultArray.push(promise);
				}
			}
			if(resolvedCount === ln){
				resolve(resultArray);
			}
		});
	};

	Promise.race = function(promises){
		'use strict';

		var i = 0, ln, promise;		

		return new Promise(function(resolve, reject){
			
			if(!! isArray(Promises)){
				//reject(throw new TypeError('Promise.all need a array as the first argument');
				throw new TypeError('Promise.all need a array of Promise!');
			}

			ln = promises.length;

			for(;i < ln; i++){
				promise = promises[i];
				if(isThenale(promise)){
					promise.then(function(value){
						resolvedCount++;
						resultArray.push(value);
						if(resolvedCount === ln){
							resolve(resultArray);
						}
					},function(reason){
						reject(reason);
					});
				}else{
					resolve(promise);
				}
			}
		});
	};

	Promise.resolve = function(args){
		'use strict';

		var promise = null;

		if(args instanceof Promise){
			promise = args;
		}else if(isThenale(args)){
			promise = new Promise(args.then);
		}else{
			promise = new Promise(function(resolve){
				resolve(args);
			});
		}
		return promise;
	};

	Promise.reject = function(args){
		'use strict';

		var promise = null;

		if(args instanceof Promise){
			promise = args;
		}else if(isThenale(args)){
			promise = new Promise(args.then);
		}else{
			promise = new Promise(function(resolve, reject){
				reject(args);
			});
		}
		return promise;
	};

	Promise.prototype.valueOf = function(){
		'use strict';

		return 'Promise {[[promiseState]]: '+ this._getStatus()+' , [[promiseValue]]: '+ this._getValue()+' }';
	};

	global.Promise1 = Promise;
})(window);