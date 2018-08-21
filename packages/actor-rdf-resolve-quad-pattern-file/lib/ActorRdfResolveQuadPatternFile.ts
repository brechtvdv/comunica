import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {
  ActorRdfResolveQuadPatternSource, IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput, IDataSource,
  ILazyQuadSource
} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {N3Store, Store} from "n3";
import LRU = require("lru-cache");
import * as RDF from "rdf-js";
import {N3StoreIterator} from "./N3StoreIterator";
import {N3StoreQuadSource} from "./N3StoreQuadSource";

/**
 * A comunica File RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternFile extends ActorRdfResolveQuadPatternSource
  implements IActorRdfResolveQuadPatternFileArgs {

  public readonly mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
    IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  public readonly files?: string[];
  public readonly cacheSize: number;
  public stores: LRU.Cache<string, Promise<N3Store>>;

  constructor(args: IActorRdfResolveQuadPatternFileArgs) {
    super(args);
    this.stores = new LRU<string, any>({ max: this.cacheSize });
  }

  public initializeFile(file: string, context: ActionContext, silenceErrors?: boolean): Promise<any> {
    const promise: Promise<N3Store> = this.mediatorRdfDereference.mediate({ context, url: file, silenceErrors })
      .then((page: IActorRdfDereferenceOutput) => new Promise<N3Store>((resolve, reject) => {
        const store: N3Store = new Store();
        page.quads.on('data', (quad) => store.addQuad(quad));
        page.quads.on('error', silenceErrors ? () => resolve(store) : reject);
        page.quads.on('end', () => resolve(store));
      }), (error: Error) => {
        if (silenceErrors) {
          return Promise.resolve(new Store());
        } else {
          return Promise.reject(error);
        }
      });
    this.stores.set(file, promise);
    return promise;
  }

  public async initialize(): Promise<any> {
    (this.files || []).forEach((file) => this.initializeFile(file, null));
    return null;
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!this.hasContextSingleSource('file', action.context)) {
      throw new Error(this.name + ' requires a single source with a file to be present in the context.');
    }
    return true;
  }

  protected async getSource(context: ActionContext, silenceErrors?: boolean): Promise<ILazyQuadSource> {
    const source: IDataSource = this.getContextSource(context);
    const file: string = source.value;
    let storePromise = this.stores.get(file);
    if (!storePromise) {
      storePromise = this.initializeFile(file, context, silenceErrors || source.silenceErrors);
    }
    return new N3StoreQuadSource(await storePromise);
  }

  protected async getOutput(source: RDF.Source, pattern: RDF.Quad, context: ActionContext)
  : Promise<IActorRdfResolveQuadPatternOutput> {
    // Attach totalItems to the output
    const output: IActorRdfResolveQuadPatternOutput = await super.getOutput(source, pattern, context);
    output.metadata = () => new Promise((resolve, reject) => {
      const store = (<N3StoreQuadSource> source).store;
      const totalItems: number = store.countQuads(
        N3StoreIterator.nullifyVariables(pattern.subject),
        N3StoreIterator.nullifyVariables(pattern.predicate),
        N3StoreIterator.nullifyVariables(pattern.object),
        N3StoreIterator.nullifyVariables(pattern.graph),
      );
      resolve({ totalItems });
    });
    return output;
  }

}

export interface IActorRdfResolveQuadPatternFileArgs
  extends IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  /**
   * The mediator to use for dereferencing files.
   */
  mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
    IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  /**
   * The files to preload.
   */
  files?: string[];
  /**
   * The cache size of the resolved quad stores.
   */
  cacheSize: number;
}
