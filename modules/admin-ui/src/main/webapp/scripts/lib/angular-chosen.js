/**
 * angular-chosen-localytics - Angular Chosen directive is an AngularJS Directive that brings the Chosen jQuery in a Angular way
 * @version v1.8.0
 * @link http://github.com/leocaseiro/angular-chosen
 * @license MIT
 */
(function() {
  var chosenModule,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  angular.module('localytics.directives', []);

  chosenModule = angular.module('localytics.directives');

  chosenModule.provider('chosen', function() {
    var options;
    options = {};
    return {
      setOption: function(newOpts) {
        angular.extend(options, newOpts);
      },
      $get: function() {
        return options;
      }
    };
  });

  chosenModule.directive('chosen', [
    'chosen', '$timeout', function(config, $timeout) {
      var CHOSEN_OPTION_WHITELIST, NG_OPTIONS_REGEXP, isEmpty, snakeCase;
      NG_OPTIONS_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/;
      CHOSEN_OPTION_WHITELIST = ['persistentCreateOption', 'createOptionText', 'createOption', 'skipNoResults', 'noResultsText', 'allowSingleDeselect', 'disableSearchThreshold', 'disableSearch', 'enableSplitWordSearch', 'inheritSelectClasses', 'maxSelectedOptions', 'placeholderTextMultiple', 'placeholderTextSingle', 'searchContains', 'singleBackstrokeDelete', 'displayDisabledOptions', 'displaySelectedOptions', 'width', 'includeGroupLabelInSelected', 'maxShownResults'];
      snakeCase = function(input) {
        return input.replace(/[A-Z]/g, function($1) {
          return "_" + ($1.toLowerCase());
        });
      };
      isEmpty = function(value) {
        var key;
        if (angular.isArray(value)) {
          return value.length === 0;
        } else if (angular.isObject(value)) {
          for (key in value) {
            if (value.hasOwnProperty(key)) {
              return false;
            }
          }
        }
        return true;
      };
      return {
        restrict: 'A',
        require: '?ngModel',
        priority: 1,
        link: function(scope, element, attr, ngModel) {
          var chosen, directiveOptions, empty, initOrUpdate, match, options, origRender, startLoading, stopLoading, updateMessage, valuesExpr, viewWatch;
          scope.disabledValuesHistory = scope.disabledValuesHistory ? scope.disabledValuesHistory : [];
          element = $(element);
          element.addClass('localytics-chosen');
          directiveOptions = scope.$eval(attr.chosen) || {};
          options = angular.copy(config);
          angular.extend(options, directiveOptions);
          angular.forEach(attr, function(value, key) {
            if (indexOf.call(CHOSEN_OPTION_WHITELIST, key) >= 0) {
              return attr.$observe(key, function(value) {
                var prefix;
                prefix = String(element.attr(attr.$attr[key])).slice(0, 2);
                options[snakeCase(key)] = prefix === '{{' ? value : scope.$eval(value);
                return updateMessage();
              });
            }
          });
          startLoading = function() {
            return element.addClass('loading').attr('disabled', true).trigger('chosen:updated');
          };
          stopLoading = function() {
            element.removeClass('loading');
            if (angular.isDefined(attr.disabled)) {
              element.attr('disabled', attr.disabled);
            } else {
              element.attr('disabled', false);
            }
            return element.trigger('chosen:updated');
          };
          chosen = null;
          empty = false;
          initOrUpdate = function() {
            var defaultText, dropListDom;
            if (chosen) {
              dropListDom = $(element.next('.chosen-with-drop'));
              if (dropListDom && dropListDom.length > 0) {
                return;
              }
              return element.trigger('chosen:updated');
            } else {
              scope.$evalAsync(function() {
                chosen = element.chosen(options).data('chosen');
              });
              if (angular.isObject(chosen)) {
                return defaultText = chosen.default_text;
              }
            }
          };
          updateMessage = function() {
            if (chosen && empty) {
              element.attr('data-placeholder', chosen.results_none_found).attr('disabled', true);
            } else {
              element.removeAttr('data-placeholder');
            }
            return element.trigger('chosen:updated');
          };
          if (ngModel) {
            origRender = ngModel.$render;
            ngModel.$render = function() {
              origRender();
              return initOrUpdate();
            };
            element.on('chosen:hiding_dropdown', function() {
              return scope.$apply(function() {
                return ngModel.$setTouched();
              });
            });
            if (attr.multiple) {
              viewWatch = function() {
                return ngModel.$viewValue;
              };
              scope.$watch(viewWatch, ngModel.$render, true);
            }
          } else {
            initOrUpdate();
          }
          attr.$observe('disabled', function() {
            return element.trigger('chosen:updated');
          });
          function getMoreElements(event) {
            var raw = scope.scroller[0],
                val = this.value,
                el = element;
            scope.scrollPosition = raw.scrollTop;

            //The multiplication here tries to keep the user from hitting the bottom of the scroller
            if (raw.scrollTop + (raw.clientHeight * 2) >= raw.scrollHeight) {

              if (!angular.isUndefined(attr.ngGetMore)) {

                var _arr = attr.ngGetMore.split('.'),
                  _func = scope;

                for (var i = 0, len = _arr.length; i < len; i ++) {
                  _func = _func[_arr[i]];
                  if (typeof(_func) === 'function') break;
                }

                scope.$apply( function() {

                    if (typeof(_func) === 'function') {
                      _func(val, el)
                    }
                });
              }
            }
          };
          $timeout(function() {
            var scroller = angular.element(element).parent().children(".chosen-container").children('.chosen-drop').children('.chosen-results');
            scope.scroller = scroller;
            /* This makes opencast-scroll-glue work, the if check prevents the unit tests from failing */
            if (angular.isDefined(scroller.injector())) {
              scroller.injector().invoke(['$compile', function($compile) {
                var scope = angular.element(scroller).scope();
                $compile(scroller)(scope);
              }]);
            }
            scroller.bind('scroll', getMoreElements);
            var search = angular.element(angular.element(element).parent().children(".chosen-container").children('.chosen-drop').children('.chosen-search')[0].childNodes["0"]);
            search.bind('keyup.chosen paste.chosen', getMoreElements);
          });
          if (attr.ngOptions && ngModel) {
            match = attr.ngOptions.match(NG_OPTIONS_REGEXP);
            valuesExpr = match[7];
            scope.$watchCollection(valuesExpr, function(newVal, oldVal) {
              var timer;
              return timer = $timeout(function() {
                if (angular.isUndefined(newVal)) {
                  return startLoading();
                } else {
                  empty = isEmpty(newVal);
                  stopLoading();
                  return updateMessage();
                }
              });
            });
            return scope.$on('$destroy', function(event) {
              if (typeof timer !== "undefined" && timer !== null) {
                return $timeout.cancel(timer);
              }
            });
          }
        }
      };
    }
  ]);

}).call(this);
