import {ActorContextPreprocess} from "@comunica/bus-context-preprocess";
import {KEY_CONTEXT_SOURCES} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Bus} from "@comunica/core";
import {AsyncReiterableArray} from "asyncreiterable";
import {ActionObserverRdfDereference} from "../lib/ActionObserverRdfDereference";
import {ActorContextPreprocessFollowReachableSourcesAll} from "../lib/ActorContextPreprocessFollowReachableSourcesAll";
const streamifyArray = require('streamify-array');
const quad = require('rdf-quad');

describe('ActorContextPreprocessFollowReachableSourcesAll', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorContextPreprocessFollowReachableSourcesAll module', () => {
    it('should be a function', () => {
      expect(ActorContextPreprocessFollowReachableSourcesAll).toBeInstanceOf(Function);
    });

    it('should be a ActorContextPreprocessFollowReachableSourcesAll constructor', () => {
      expect(new (<any> ActorContextPreprocessFollowReachableSourcesAll)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorContextPreprocessFollowReachableSourcesAll);
      expect(new (<any> ActorContextPreprocessFollowReachableSourcesAll)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorContextPreprocess);
    });

    it('should not be able to create new ActorContextPreprocessFollowReachableSourcesAll without \'new\'', () => {
      expect(() => { (<any> ActorContextPreprocessFollowReachableSourcesAll)(); }).toThrow();
    });
  });

  describe('An ActorContextPreprocessFollowReachableSourcesAll instance', () => {
    let actor: ActorContextPreprocessFollowReachableSourcesAll;
    let rdfDereferenceBus;
    let rdfDereferenceObserver;

    beforeEach(() => {
      rdfDereferenceBus = new Bus({ name: 'rdfDereferenceBus' });
      rdfDereferenceObserver = new ActionObserverRdfDereference({ name: 'myObserver', bus: rdfDereferenceBus });
      actor = new ActorContextPreprocessFollowReachableSourcesAll({ name: 'actor', bus, rdfDereferenceObserver });
    });

    it('should test', () => {
      return expect(actor.test({})).resolves.toBeTruthy();
    });

    it('should run without a context', () => {
      return expect(actor.run({})).resolves.toEqual({});
    });

    it('should run with a context without sources', () => {
      return expect(actor.run({ context: ActionContext({}) })).resolves.toEqual({ context: ActionContext({}) });
    });

    it('should run with a context without sources', () => {
      return expect(actor.run({ context: ActionContext({}) })).resolves.toEqual({ context: ActionContext({}) });
    });

    it('should run with a context with sources', async () => {
      const context = ActionContext({
        [KEY_CONTEXT_SOURCES]: AsyncReiterableArray.fromFixedData([
          { type: 'file', value: 'x' },
        ]),
      });
      const output = await actor.run({ context });

      // Block until input sources have been processed
      await new Promise((resolve, reject) => {
        const itIn = context.get(KEY_CONTEXT_SOURCES).iterator();
        itIn.on('data', () => { return; });
        itIn.on('end', resolve);
      });

      expect(output.context.get(KEY_CONTEXT_SOURCES).isEnded()).toBe(false);
      const it = output.context.get(KEY_CONTEXT_SOURCES).iterator();
      expect(it.read()).toEqual({ type: 'file', value: 'x' });
    });

    it('should run with a context with sources and append when the observer encounters new quads', async () => {
      const context = ActionContext({
        [KEY_CONTEXT_SOURCES]: AsyncReiterableArray.fromFixedData([
          { type: 'file', value: 'x' },
        ]),
      });

      const output = await actor.run({ context });

      // Block until input sources have been processed
      await new Promise((resolve, reject) => {
        const itIn = context.get(KEY_CONTEXT_SOURCES).iterator();
        itIn.on('data', () => { return; });
        itIn.on('end', resolve);
      });

      const quads = streamifyArray([quad('a', 'b', 'b', 'd')]);
      rdfDereferenceObserver.onRun(null, null, Promise.resolve({ quads }));
      await new Promise((resolve) => quads.on('end', resolve));

      expect(output.context.get(KEY_CONTEXT_SOURCES).isEnded()).toBe(false);
      const it = output.context.get(KEY_CONTEXT_SOURCES).iterator();
      expect(it.read()).toEqual({ type: 'file', value: 'x' });
      expect(it.read()).toEqual({ type: 'file', value: 'a', silenceErrors: true });
      expect(it.read()).toEqual({ type: 'file', value: 'b', silenceErrors: true });
      expect(it.read()).toEqual({ type: 'file', value: 'd', silenceErrors: true });
    });
  });
});
