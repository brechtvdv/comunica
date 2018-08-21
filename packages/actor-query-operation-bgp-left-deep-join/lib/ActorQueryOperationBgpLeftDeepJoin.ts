import {ActorQueryOperationTypedMediated, IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {Algebra, Factory} from "sparqlalgebrajs";

/**
 * A comunica BGP Left-deep Join Query Operation Actor that creates an unoptimized left-deep tree.
 */
export class ActorQueryOperationBgpLeftDeepJoin extends ActorQueryOperationTypedMediated<Algebra.Bgp> {

  public static FACTORY: Factory = new Factory();

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'bgp');
  }

  public async testOperation(pattern: Algebra.Bgp, context: ActionContext): Promise<IActorTest> {
    if (pattern.patterns.length < 2) {
      throw new Error('Actor ' + this.name + ' can only operate on BGPs with at least two patterns.');
    }
    return true;
  }

  public async runOperation(pattern: Algebra.Bgp, context: ActionContext)
    : Promise<IActorQueryOperationOutput> {
    const operation: Algebra.Operation = pattern.patterns.reduce((prev, curr) => {
      if (!prev) {
        return curr;
      } else {
        return ActorQueryOperationBgpLeftDeepJoin.FACTORY.createJoin(prev, curr);
      }
    }, null);
    return this.mediatorQueryOperation.mediate({ operation, context });
  }

}
