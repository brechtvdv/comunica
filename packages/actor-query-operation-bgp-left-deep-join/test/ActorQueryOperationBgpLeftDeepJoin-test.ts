import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {ActionContext, Bus} from "@comunica/core";
import {literal, namedNode, quad, variable} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationBgpLeftDeepJoin} from "../lib/ActorQueryOperationBgpLeftDeepJoin";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationBgpLeftDeepJoin', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: literal(arg.operation.left.subject.value + arg.operation.right.subject.value) }),
          Bindings({ a: literal(arg.operation.left.predicate.value + arg.operation.right.predicate.value) }),
          Bindings({ a: literal(arg.operation.left.object.value + arg.operation.right.object.value) }),
          Bindings({ a: literal(arg.operation.left.graph.value + arg.operation.right.graph.value) }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 4 }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }),
    };
  });

  describe('The ActorQueryOperationBgpLeftDeepJoin module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationBgpLeftDeepJoin).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationBgpLeftDeepJoin constructor', () => {
      expect(new (<any> ActorQueryOperationBgpLeftDeepJoin)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationBgpLeftDeepJoin);
      expect(new (<any> ActorQueryOperationBgpLeftDeepJoin)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationBgpLeftDeepJoin objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationBgpLeftDeepJoin)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationBgpLeftDeepJoin instance', () => {
    let actor: ActorQueryOperationBgpLeftDeepJoin;

    beforeEach(() => {
      actor = new ActorQueryOperationBgpLeftDeepJoin({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should not test on empty BGPs', () => {
      const op = { operation: { type: 'bgp', patterns: [] } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on BGPs with a single pattern', () => {
      const op = { operation: { type: 'bgp', patterns: [ 'abc' ] } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should test on BGPs with more than one pattern', () => {
      const op = { operation: { type: 'bgp', patterns: [ 'abc', 'def' ] } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-bgp', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    const pattern1 = quad(namedNode('1'), namedNode('2'), namedNode('3'), variable('4'));
    const pattern2 = quad(variable('a'), namedNode('b'), namedNode('c'), namedNode('d'));
    const patterns = [ pattern1, pattern2 ];

    it('should run with a context and delegate the operation to the mediator as a join', () => {
      const op = { operation: { type: 'bgp', patterns }, context: ActionContext({ totalItems: 10, variables: ['a'] }) };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual(['a']);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: 4 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1a') }),
          Bindings({ a: literal('2b') }),
          Bindings({ a: literal('3c') }),
          Bindings({ a: literal('4d') }),
        ]);
      });
    });
  });
});
