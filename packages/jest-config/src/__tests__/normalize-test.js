/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 */
'use strict';

jest.mock('jest-resolve');

jest.mock('path', () => require.requireActual('path').posix);

const crypto = require('crypto');
const path = require('path');
const utils = require('jest-regex-util');
const normalize = require('../normalize');

const DEFAULT_JS_PATTERN = require('../constants').DEFAULT_JS_PATTERN;
const DEFAULT_CSS_PATTERN = '^.+\\.(css)$';

let root;
let expectedPathFooBar;
let expectedPathFooQux;
let expectedPathAbs;
let expectedPathAbsAnother;

// Windows uses backslashes for path separators, which need to be escaped in
// regular expressions. This little helper function helps us generate the
// expected strings for checking path patterns.
function joinForPattern() {
  return Array.prototype.join.call(
    arguments,
    utils.escapeStrForRegex(path.sep),
  );
}

beforeEach(() => {
  root = path.resolve('/');
  expectedPathFooBar = path.join(root, 'root', 'path', 'foo', 'bar', 'baz');
  expectedPathFooQux = path.join(root, 'root', 'path', 'foo', 'qux', 'quux');
  expectedPathAbs = path.join(root, 'an', 'abs', 'path');
  expectedPathAbsAnother = path.join(root, 'another', 'abs', 'path');
});

it('picks a name based on the rootDir', () => {
  const rootDir = '/root/path/foo';
  const expected = crypto
    .createHash('md5')
    .update('/root/path/foo')
    .digest('hex');
  expect(
    normalize({
      rootDir,
    }).options.name,
  ).toBe(expected);
});

it('keeps custom names based on the rootDir', () => {
  expect(
    normalize({
      name: 'custom-name',
      rootDir: '/root/path/foo',
    }).options.name,
  ).toBe('custom-name');
});

it('sets coverageReporters correctly when argv.json is set', () => {
  expect(
    normalize(
      {
        rootDir: '/root/path/foo',
      },
      {
        json: true,
      },
    ).options.coverageReporters,
  ).toEqual(['json', 'lcov', 'clover']);
});

describe('rootDir', () => {
  it('throws if the options is missing a rootDir property', () => {
    expect(() => {
      normalize({});
    }).toThrowErrorMatchingSnapshot();
  });
});

describe('automock', () => {
  it('falsy automock is not overwritten', () => {
    const consoleWarn = console.warn;
    console.warn = jest.fn();
    const {options} = normalize({
      automock: false,
      rootDir: '/root/path/foo',
    });

    expect(options.automock).toBe(false);

    console.warn = consoleWarn;
  });
});

describe('browser', () => {
  it('falsy browser is not overwritten', () => {
    const {options} = normalize({
      browser: true,
      rootDir: '/root/path/foo',
    });

    expect(options.browser).toBe(true);
  });
});

describe('collectCoverageOnlyFrom', () => {
  it('normalizes all paths relative to rootDir', () => {
    const {options} = normalize(
      {
        collectCoverageOnlyFrom: {
          'bar/baz': true,
          'qux/quux/': true,
        },
        rootDir: '/root/path/foo/',
      },
      '/root/path',
    );

    const expected = {};
    expected[expectedPathFooBar] = true;
    expected[expectedPathFooQux] = true;

    expect(options.collectCoverageOnlyFrom).toEqual(expected);
  });

  it('does not change absolute paths', () => {
    const {options} = normalize({
      collectCoverageOnlyFrom: {
        '/an/abs/path': true,
        '/another/abs/path': true,
      },
      rootDir: '/root/path/foo',
    });

    const expected = {};
    expected[expectedPathAbs] = true;
    expected[expectedPathAbsAnother] = true;

    expect(options.collectCoverageOnlyFrom).toEqual(expected);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize({
      collectCoverageOnlyFrom: {
        '<rootDir>/bar/baz': true,
      },
      rootDir: '/root/path/foo',
    });

    const expected = {};
    expected[expectedPathFooBar] = true;

    expect(options.collectCoverageOnlyFrom).toEqual(expected);
  });
});

function testPathArray(key) {
  it('normalizes all paths relative to rootDir', () => {
    const {options} = normalize(
      {
        [key]: ['bar/baz', 'qux/quux/'],
        rootDir: '/root/path/foo',
      },
      '/root/path',
    );

    expect(options[key]).toEqual([expectedPathFooBar, expectedPathFooQux]);
  });

  it('does not change absolute paths', () => {
    const {options} = normalize({
      [key]: ['/an/abs/path', '/another/abs/path'],
      rootDir: '/root/path/foo',
    });

    expect(options[key]).toEqual([expectedPathAbs, expectedPathAbsAnother]);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize({
      [key]: ['<rootDir>/bar/baz'],
      rootDir: '/root/path/foo',
    });

    expect(options[key]).toEqual([expectedPathFooBar]);
  });
}

describe('roots', () => {
  testPathArray('roots');
});

describe('transform', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name => name);
  });

  it('normalizes the path', () => {
    const {options} = normalize(
      {
        rootDir: '/root/',
        transform: {
          [DEFAULT_CSS_PATTERN]: '<rootDir>/node_modules/jest-regex-util',
          [DEFAULT_JS_PATTERN]: 'babel-jest',
          'abs-path': '/qux/quux',
        },
      },
      '/root/path',
    );

    expect(options.transform).toEqual([
      [DEFAULT_CSS_PATTERN, '/root/node_modules/jest-regex-util'],
      [DEFAULT_JS_PATTERN, 'babel-jest'],
      ['abs-path', '/qux/quux'],
    ]);
  });
});

describe('haste', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name => name);
  });

  it('normalizes the path for hasteImplModulePath', () => {
    const {options} = normalize({
      haste: {
        hasteImplModulePath: '<rootDir>/hasteImpl.js',
      },
      rootDir: '/root/',
    });

    expect(options.haste).toEqual({
      hasteImplModulePath: '/root/hasteImpl.js',
    });
  });
});

describe('setupTestFrameworkScriptFile', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(
      name =>
        name.startsWith('/') ? name : '/root/path/foo' + path.sep + name,
    );
  });

  it('normalizes the path according to rootDir', () => {
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
        setupTestFrameworkScriptFile: 'bar/baz',
      },
      '/root/path',
    );

    expect(options.setupTestFrameworkScriptFile).toEqual(expectedPathFooBar);
  });

  it('does not change absolute paths', () => {
    const {options} = normalize({
      rootDir: '/root/path/foo',
      setupTestFrameworkScriptFile: '/an/abs/path',
    });

    expect(options.setupTestFrameworkScriptFile).toEqual(expectedPathAbs);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize({
      rootDir: '/root/path/foo',
      setupTestFrameworkScriptFile: '<rootDir>/bar/baz',
    });

    expect(options.setupTestFrameworkScriptFile).toEqual(expectedPathFooBar);
  });
});

describe('coveragePathIgnorePatterns', () => {
  it('does not normalize paths relative to rootDir', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize(
      {
        coveragePathIgnorePatterns: ['bar/baz', 'qux/quux'],
        rootDir: '/root/path/foo',
      },
      '/root/path',
    );

    expect(options.coveragePathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux'),
    ]);
  });

  it('does not normalize trailing slashes', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize({
      coveragePathIgnorePatterns: ['bar/baz', 'qux/quux/'],
      rootDir: '/root/path/foo',
    });

    expect(options.coveragePathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux', ''),
    ]);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize({
      coveragePathIgnorePatterns: ['hasNoToken', '<rootDir>/hasAToken'],
      rootDir: '/root/path/foo',
    });

    expect(options.coveragePathIgnorePatterns).toEqual([
      'hasNoToken',
      joinForPattern('', 'root', 'path', 'foo', 'hasAToken'),
    ]);
  });
});

describe('testPathIgnorePatterns', () => {
  it('does not normalize paths relative to rootDir', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
        testPathIgnorePatterns: ['bar/baz', 'qux/quux'],
      },
      '/root/path',
    );

    expect(options.testPathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux'),
    ]);
  });

  it('does not normalize trailing slashes', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize({
      rootDir: '/root/path/foo',
      testPathIgnorePatterns: ['bar/baz', 'qux/quux/'],
    });

    expect(options.testPathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux', ''),
    ]);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize({
      rootDir: '/root/path/foo',
      testPathIgnorePatterns: ['hasNoToken', '<rootDir>/hasAToken'],
    });

    expect(options.testPathIgnorePatterns).toEqual([
      'hasNoToken',
      joinForPattern('', 'root', 'path', 'foo', 'hasAToken'),
    ]);
  });
});

describe('modulePathIgnorePatterns', () => {
  it('does not normalize paths relative to rootDir', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize(
      {
        modulePathIgnorePatterns: ['bar/baz', 'qux/quux'],
        rootDir: '/root/path/foo',
      },
      '/root/path',
    );

    expect(options.modulePathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux'),
    ]);
  });

  it('does not normalize trailing slashes', () => {
    // This is a list of patterns, so we can't assume any of them are
    // directories
    const {options} = normalize({
      modulePathIgnorePatterns: ['bar/baz', 'qux/quux/'],
      rootDir: '/root/path/foo',
    });

    expect(options.modulePathIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux', ''),
    ]);
  });

  it('substitutes <rootDir> tokens', () => {
    const {options} = normalize({
      modulePathIgnorePatterns: ['hasNoToken', '<rootDir>/hasAToken'],
      rootDir: '/root/path/foo',
    });

    expect(options.modulePathIgnorePatterns).toEqual([
      'hasNoToken',
      joinForPattern('', 'root', 'path', 'foo', 'hasAToken'),
    ]);
  });
});

describe('testRunner', () => {
  it('defaults to Jasmine 2', () => {
    const {options} = normalize({
      rootDir: '/root/path/foo',
    });

    expect(options.testRunner).toMatch('jasmine2');
  });

  it('can be changed to jasmine1', () => {
    const {options} = normalize({
      rootDir: '/root/path/foo',
      testRunner: 'jasmine1',
    });

    expect(options.testRunner).toMatch('jasmine1');
  });

  it('is overwritten by argv', () => {
    const {options} = normalize(
      {
        rootDir: '/root/path/foo',
      },
      {
        testRunner: 'jasmine1',
      },
    );

    expect(options.testRunner).toMatch('jasmine1');
  });
});

describe('testEnvironment', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(name => {
      if (name === 'jsdom') {
        return 'node_modules/jsdom';
      }
      if (name === 'jest-environment-jsdom') {
        return 'node_modules/jest-environment-jsdom';
      }
      return null;
    });
  });

  it('resolves to an environment and prefers jest-environment-`name`', () => {
    const {options} = normalize({
      rootDir: '/root',
      testEnvironment: 'jsdom',
    });

    expect(options.testEnvironment).toEqual(
      'node_modules/jest-environment-jsdom',
    );
  });

  it('throws on invalid environment names', () => {
    expect(() =>
      normalize({
        rootDir: '/root',
        testEnvironment: 'phantom',
      }),
    ).toThrowErrorMatchingSnapshot();
  });
});

describe('babel-jest', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(
      name => path.sep + 'node_modules' + path.sep + name,
    );
  });

  it('correctly identifies and uses babel-jest', () => {
    const {options} = normalize({
      rootDir: '/root',
    });

    expect(options.transform[0][0]).toBe(DEFAULT_JS_PATTERN);
    expect(options.transform[0][1]).toEqual(
      path.sep + 'node_modules' + path.sep + 'babel-jest',
    );
    expect(options.setupFiles).toEqual([
      path.sep +
        'node_modules' +
        path.sep +
        'regenerator-runtime' +
        path.sep +
        'runtime',
    ]);
  });

  it('uses babel-jest if babel-jest is explicitly specified in a custom transform options', () => {
    const customJSPattern = '^.+\\.js$';
    const {options} = normalize({
      rootDir: '/root',
      transform: {
        [customJSPattern]: 'babel-jest',
      },
    });

    expect(options.transform[0][0]).toBe(customJSPattern);
    expect(options.transform[0][1]).toEqual('/node_modules/babel-jest');
    expect(options.setupFiles).toEqual([
      path.sep +
        'node_modules' +
        path.sep +
        'regenerator-runtime' +
        path.sep +
        'runtime',
    ]);
  });

  it(`doesn't use babel-jest if its not available`, () => {
    Resolver.findNodeModule.mockImplementation(() => null);

    const {options} = normalize({
      rootDir: '/root',
    });

    expect(options.transform).toEqual(undefined);
    expect(options.setupFiles).toEqual([]);
  });

  it('uses regenerator if babel-jest is explicitly specified', () => {
    const ROOT_DIR = '<rootDir>' + path.sep;

    const {options} = normalize({
      rootDir: '/root',
      transform: {
        [DEFAULT_JS_PATTERN]: ROOT_DIR + Resolver.findNodeModule('babel-jest'),
      },
    });

    expect(options.setupFiles).toEqual([
      path.sep +
        'node_modules' +
        path.sep +
        'regenerator-runtime' +
        path.sep +
        'runtime',
    ]);
  });
});

describe('Upgrade help', () => {
  let consoleWarn;

  beforeEach(() => {
    consoleWarn = console.warn;
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.warn = consoleWarn;
  });

  it('logs a warning when `scriptPreprocessor` and/or `preprocessorIgnorePatterns` are used', () => {
    const {options: options, hasDeprecationWarnings} = normalize({
      preprocessorIgnorePatterns: ['bar/baz', 'qux/quux'],
      rootDir: '/root/path/foo',
      scriptPreprocessor: 'bar/baz',
    });

    expect(options.transform).toEqual([['.*', '/node_modules/bar/baz']]);
    expect(options.transformIgnorePatterns).toEqual([
      joinForPattern('bar', 'baz'),
      joinForPattern('qux', 'quux'),
    ]);

    expect(options.scriptPreprocessor).toBe(undefined);
    expect(options.preprocessorIgnorePatterns).toBe(undefined);
    expect(hasDeprecationWarnings).toBeTruthy();

    expect(console.warn.mock.calls[0][0]).toMatchSnapshot();
  });
});

describe('testMatch', () => {
  it('testMatch default not applied if testRegex is set', () => {
    const {options} = normalize({
      rootDir: '/root',
      testRegex: '.*',
    });

    expect(options.testMatch.length).toBe(0);
  });

  it('testRegex default not applied if testMatch is set', () => {
    const {options} = normalize({
      rootDir: '/root',
      testMatch: ['**/*.js'],
    });

    expect(options.testRegex).toBe('');
  });

  it('throws if testRegex and testMatch are both specified', () => {
    expect(() => {
      normalize({
        rootDir: '/root',
        testMatch: ['**/*.js'],
        testRegex: '.*',
      });
    }).toThrowErrorMatchingSnapshot();
  });
});

describe('preset', () => {
  beforeAll(() => {
    jest.mock(
      '/node_modules/react-native/jest-preset.json',
      () => ({
        moduleNameMapper: {b: 'b'},
        modulePathIgnorePatterns: ['b'],
        setupFiles: ['b'],
      }),
      {virtual: true},
    );
  });

  afterAll(() => {
    jest.unmock('/node_modules/react-native/jest-preset.json');
  });

  test('throws when preset not found', () => {
    expect(() => {
      normalize({
        preset: 'doesnt-exist',
        rootDir: '/root/path/foo',
      });
    }).toThrowErrorMatchingSnapshot();
  });

  test('works with "react-native"', () => {
    expect(() => {
      normalize({
        preset: 'react-native',
        rootDir: '/root/path/foo',
      });
    }).not.toThrow();
  });

  test('merges with options', () => {
    const {options} = normalize({
      moduleNameMapper: {a: 'a'},
      modulePathIgnorePatterns: ['a'],
      preset: 'react-native',
      rootDir: '/root/path/foo',
      setupFiles: ['a'],
    });
    expect(options).toEqual(
      expect.objectContaining({
        moduleNameMapper: expect.arrayContaining([['a', 'a'], ['b', 'b']]),
        modulePathIgnorePatterns: expect.arrayContaining(['a', 'b']),
        setupFiles: expect.arrayContaining([
          '/node_modules/a',
          '/node_modules/b',
        ]),
      }),
    );
  });
});

describe('preset without setupFiles', () => {
  let Resolver;
  beforeEach(() => {
    Resolver = require('jest-resolve');
    Resolver.findNodeModule = jest.fn(
      name => path.sep + 'node_modules' + path.sep + name,
    );
  });

  beforeAll(() => {
    jest.mock(
      '/node_modules/react-native/jest-preset.json',
      () => {
        return {
          moduleNameMapper: {b: 'b'},
          modulePathIgnorePatterns: ['b'],
        };
      },
      {virtual: true},
    );
  });

  it('should normalize setupFiles correctly', () => {
    const {options} = normalize({
      preset: 'react-native',
      rootDir: '/root/path/foo',
      setupFiles: ['a'],
    });

    expect(options).toEqual(
      expect.objectContaining({
        setupFiles: expect.arrayContaining(['/node_modules/a']),
      }),
    );
  });
});

describe('projects', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('resolves projects correctly', () => {
    const root = '/path/to/test';

    const glob = require('glob');
    glob.sync = jest.fn(
      pattern =>
        pattern.indexOf('/examples/') !== -1
          ? [root + '/examples/async', root + '/examples/snapshot']
          : [pattern],
    );
    const normalize = require('../normalize');

    const {options} = normalize({
      projects: ['<rootDir>', '<rootDir>/examples/*'],
      rootDir: root,
    });

    expect(options.projects).toEqual([
      root,
      root + '/examples/async',
      root + '/examples/snapshot',
    ]);
  });
});
