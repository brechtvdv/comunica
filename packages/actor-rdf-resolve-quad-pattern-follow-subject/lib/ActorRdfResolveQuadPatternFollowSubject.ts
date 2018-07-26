import {
  ActorRdfResolveQuadPattern, IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput, KEY_CONTEXT_SOURCE,
} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {EmptyIterator} from "asynciterator";

/**
 * A comunica Follow Subject RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternFollowSubject extends ActorRdfResolveQuadPattern {

  public readonly mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;

  constructor(args: IActorRdfResolveQuadPatternFollowSubjectArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!this.hasContextSingleSource('traverselinks', action.context)) {
      throw new Error(this.name + ' requires a traverselinks source to be present in the context.');
    }
    return true;
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    if (action.pattern.subject.termType !== 'NamedNode') {
      return {
        data: new EmptyIterator(),
        metadata: () => Promise.resolve({ totalItems: Infinity }),
      };
    }
    const context = action.context.set(KEY_CONTEXT_SOURCE, { type: 'file', value: action.pattern.subject.value });
    return this.mediatorResolveQuadPattern.mediate({ pattern: action.pattern, context, silenceErrors: true });
  }

}

export interface IActorRdfResolveQuadPatternFollowSubjectArgs
  extends IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;
}
