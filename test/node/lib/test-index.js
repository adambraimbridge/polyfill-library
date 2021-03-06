
'use strict';
const assert = require('proclaim');
const setsToArrays = require('../../utils/sets-to-arrays');

const polyfillio = require('../../../lib');

describe("polyfillio", function () {
	this.timeout(30000);

	describe(".getPolyfills(features)", () => {

		it("should not include unused dependencies", () => {
			const input = {
				features: {
					'Promise': {}
				},
				uaString: 'chrome/45'
			};
			return polyfillio.getPolyfills(input).then(result => assert.deepEqual(setsToArrays(result), {}));
		});

		it("https://github.com/Financial-Times/polyfill-library/issues/125", () => {
			// es6,es7&excludes=Array.prototype.values
			const input = {
				features: {
					'es6': {},
					'es7': {},
				},
				excludes: ['Array.prototype.values'],
				uaString: 'chrome/61'
			};
			return polyfillio.getPolyfills(input).then(result => assert.deepEqual(setsToArrays(result), {}));
		});

		it("should return polyfills for unknown UA when unknown is not set", () => {
			return polyfillio.getPolyfills({
				features: {
					'Math.sign': {}
				},
				uaString: ''
			}).then(result => assert.deepEqual(setsToArrays(result), {
				'Math.sign': {
					"flags": ["gated"],
					aliasOf: [],
					dependencyOf: []
				},
				"Object.defineProperty": {
					"dependencyOf": [
						"Math.sign",
						"_ESAbstract.CreateMethodProperty"
					],
					"flags": ["gated"],
					aliasOf: []
				},
				"_ESAbstract.CreateMethodProperty": {
					"dependencyOf": [
						"Math.sign"
					],
					"flags": ["gated"],
					aliasOf: []
				}
			}));
		});

		it("should return no polyfills for unknown UA when unknown is set to ignore", () => {
			return polyfillio.getPolyfills({
				features: {
					'Math.sign': {}
				},
				uaString: '',
				unknown: 'ignore',
			}).then(result => assert.deepEqual(setsToArrays(result), {}));
		});

		it("should return polyfills for unknown UA when unknown is set to `polyfill`", () => {
			return polyfillio.getPolyfills({
				features: {
					'Math.sign': {}
				},
				unknown: 'polyfill',
				uaString: ''
			}).then(result => assert.deepEqual(setsToArrays(result), {
				'Math.sign': {
					"flags": ["gated"],
					aliasOf: [],
					dependencyOf: []
				},
				"Object.defineProperty": {
					"dependencyOf": [
						"Math.sign",
						"_ESAbstract.CreateMethodProperty"
					],
					"flags": ["gated"],
					aliasOf: []
				},
				"_ESAbstract.CreateMethodProperty": {
					"dependencyOf": [
						"Math.sign"
					],
					"flags": ["gated"],
					aliasOf: []
				}
			}));
		});

		it("should return polyfills for unknown UA when unknown is set to `polyfill` and `uaString` param is not set", () => {
			// ... even when `uaString` param is missing entirely
			return polyfillio.getPolyfills({
				features: {
					'Math.sign': {}
				},
				unknown: 'polyfill',
			}).then(result => assert.deepEqual(setsToArrays(result), {
				'Math.sign': {
					"flags": ["gated"],
					"aliasOf": [],
					"dependencyOf": []
				},
				"Object.defineProperty": {
					"dependencyOf": [
						"Math.sign",
						"_ESAbstract.CreateMethodProperty"
					],
					"flags": ["gated"],
					aliasOf: []
				},
				"_ESAbstract.CreateMethodProperty": {
					"dependencyOf": [
						"Math.sign"
					],
					"flags": ["gated"],
					aliasOf: []
				}
			}));
		});

		it("should understand the 'all' alias", () => {
			return polyfillio.getPolyfills({
				features: {
					'all': {
						flags: []
					}
				},
				uaString: 'ie/8'
			}).then(result => assert(Object.keys(result).length > 0));
		});

		it("should respect the excludes option", async () => {
			const noExcludes = await polyfillio.getPolyfills({
				features: {
					"Math.fround": {}
				},
				uaString: "ie/9"
			});
			
			assert.deepEqual(setsToArrays(noExcludes), {
				"Math.fround": { 
					flags: [],
					dependencyOf: [],
					aliasOf: []
				},
				"_ESAbstract.CreateMethodProperty": {
					flags: [],
					dependencyOf: ["Math.fround"],
					aliasOf: []
				},
				_TypedArray: {
					flags: [], 
					dependencyOf: ["Math.fround"],
					aliasOf: []
				}
			});
			
			const excludes = await polyfillio.getPolyfills({
				features: {
					"Math.fround": {}
				},
				excludes: ["_TypedArray", "non-existent-feature"],
				uaString: "ie/9"
			});
			
			assert.deepEqual(setsToArrays(excludes), {
				"Math.fround": {
					flags: [],
					dependencyOf: [],
					aliasOf: []
				},
				"_ESAbstract.CreateMethodProperty": {
					flags: [],
					dependencyOf: ["Math.fround"],
					aliasOf: []
				}
			});
		});
	});

	describe('.getPolyfillString', () => {

		it('should produce different output when gated flag is enabled', () => {
			return Promise.all([
				polyfillio.getPolyfillString({
					features: {
						default: {}
					},
					uaString: 'chrome/30'
				}),
				polyfillio.getPolyfillString({
					features: {
						default: {
							flags: new Set(['gated'])
						}
					},
					uaString: 'chrome/30'
				})
			]).then(results => {
				assert.notEqual(setsToArrays(results[0]), setsToArrays(results[1]));
			});
		});

		it('should support streaming output', done => {
			const ReadableStream = require('stream').Readable;
			const buf = [];
			const s = polyfillio.getPolyfillString({
				features: {
					default: {}
				},
				uaString: 'chrome/30',
				stream: true,
				minify: false
			});
			assert.instanceOf(s, ReadableStream);
			s.on('data', chunk => buf.push(chunk));
			s.on('end', () => {
				const bundle = buf.join('');
				assert.include(bundle, 'Polyfill service');
				assert.include(bundle, "function(self, undefined)");
				done();
			});
		});

	});
});