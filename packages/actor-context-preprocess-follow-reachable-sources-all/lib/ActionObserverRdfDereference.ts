import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {ActionObserver, Actor, IActionObserverArgs, IActorTest} from "@comunica/core";
import {getNamedNodes, getTerms} from "rdf-terms";

export class ActionObserverRdfDereference extends ActionObserver<IActionRdfDereference, IActorRdfDereferenceOutput> {

  private readonly processedUris: {[uri: string]: boolean} = {};
  private readonly uriListeners: IUriListener[] = [];

  constructor(args: IActionObserverArgs<IActionRdfDereference, IActorRdfDereferenceOutput>) {
    super(args);
    this.bus.subscribeObserver(this);
  }

  public onRun(actor: Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
               action: IActionRdfDereference, output: Promise<IActorRdfDereferenceOutput>): void {
    output.then((rdfDereferenceOutput) => {
      rdfDereferenceOutput.quads.on('data', (quad) => {
        for (const nameNode of getNamedNodes(getTerms(quad))) {
          const uri = nameNode.value;
          if (!this.processedUris[uri]) {
            this.processedUris[uri] = true;
            for (const uriListener of this.uriListeners) {
              uriListener(uri);
            }
          }
        }
      });
    });
  }

  public addUriListener(uriListener: IUriListener) {
    this.uriListeners.push(uriListener);
  }

}

export type IUriListener = (uri: string) => void;
