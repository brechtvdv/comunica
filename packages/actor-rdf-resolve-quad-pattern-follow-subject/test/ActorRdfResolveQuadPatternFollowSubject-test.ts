import {ActorRdfResolveQuadPattern} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Bus} from "@comunica/core";
import {ActorRdfResolveQuadPatternFollowSubject} from "../lib/ActorRdfResolveQuadPatternFollowSubject";
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const streamifyArray = require('streamify-array');

// tslint:disable:object-literal-sort-keys

describe('ActorRdfResolveQuadPatternFollowSubject', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfResolveQuadPatternFollowSubject module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternFollowSubject).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternFollowSubject constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternFollowSubject)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPatternFollowSubject);
      expect(new (<any> ActorRdfResolveQuadPatternFollowSubject)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPattern);
    });

    it('should not be able to create new ActorRdfResolveQuadPatternFollowSubject objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternFollowSubject)(); }).toThrow();
    });
  });

  describe('An ActorRdfResolveQuadPatternFollowSubject instance', () => {
    let actor: ActorRdfResolveQuadPatternFollowSubject;
    let mediatorResolveQuadPattern;

    beforeEach(() => {
      mediatorResolveQuadPattern = {
        mediate: (action) => Promise.resolve({
          metadata: () => Promise.resolve({ totalItems: 2 }),
          data: streamifyArray([
            quad(action.pattern.subject.value, 'p1', 'o1'),
            quad(action.pattern.subject.value, 'p1', 'o2'),
          ]),
        }),
      };
      actor = new ActorRdfResolveQuadPatternFollowSubject({ name: 'actor', bus, mediatorResolveQuadPattern });
    });

    it('should test', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'traverselinks', value: true  }}),
      })).resolves.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test({ pattern: null, context: null })).rejects.toBeTruthy();
    });

    it('should not test without traverselinks', () => {
      return expect(actor.test({ pattern: null, context: ActionContext({}) })).rejects.toBeTruthy();
    });

    it('should not test on a falsy traverselinks value', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'traverselinks', value: null }}),
      })).rejects.toBeTruthy();
    });

    it('should not test on no traverselinks', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'entrypoint', value: null }}),
      })).rejects.toBeTruthy();
    });

    it('should not test on no sources', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': [] }),
      })).rejects.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:sources': [
              { type: 'traverselinks', value: true }, { type: 'traverselinks', value: true },
        ] }),
      })).rejects.toBeTruthy();
    });

    it('should run on a named node subject', () => {
      const pattern = quad('s', '?', '?');
      return actor.run({ pattern, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:sources': [{ type: 'traverselinks', value: true }] }) })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: 2 });
          expect(await arrayifyStream(output.data)).toEqual([
            quad('s', 'p1', 'o1'),
            quad('s', 'p1', 'o2'),
          ]);
        });
    });

    it('should run on a named node variable', () => {
      const pattern = quad('?s', '?', '?');
      return actor.run({ pattern, context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': [{ type: 'traverselinks', value: true }] }) })
        .then(async (output) => {
          expect(await output.metadata()).toEqual({ totalItems: Infinity });
          expect(await arrayifyStream(output.data)).toEqual([]);
        });
    });
  });
});
