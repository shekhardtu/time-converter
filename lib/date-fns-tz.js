(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.dateFnsTz = {}));
}(this, (function (exports) { 'use strict';

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  var dateFns = {};

  (function(module, exports) {
  (function (global, factory) {
    module.exports = factory() ;
  }(commonjsGlobal, (function () {
    // Your code here...
  })));
  }(dateFns, dateFns.exports));

  // The rest of the library code...
  // This is a placeholder for the actual library code which is very long.
  // In a real scenario, this would be the full content of the date-fns-tz.umd.js file.

  // Placeholder for the actual implementation
  const parse = function(dateString, formatString, referenceDate, options) {
    //-snip-
  }

  const format = function(date, formatString, options) {
    //-snip-
  }

  const toDate = function(argument, options) {
    //-snip-
  }

  const utcToZonedTime = function(date, timeZone, options) {
    //-snip-
  }

  const zonedTimeToUtc = function(date, timeZone, options) {
    //-snip-
  }

  const formatInTimeZone = function(date, timeZone, formatString, options) {
    //-snip-
  }

  exports.format = format;
  exports.formatInTimeZone = formatInTimeZone;
  exports.parse = parse;
  exports.toDate = toDate;
  exports.utcToZonedTime = utcToZonedTime;
  exports.zonedTimeToUtc = zonedTimeToUtc;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=date-fns-tz.umd.js.map
