import {
  ActorRdfParseFixedMediaTypes,
  IActionRdfParse,
  IActionRootRdfParse,
  IActorOutputRootRdfParse,
  IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput,
  IActorTestRootRdfParse,
} from "@comunica/bus-rdf-parse";
import {ActionContext, Actor, Mediator} from "@comunica/core";
import {Readable} from "stream";

/**
 * A HTML script RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to extract and parse any RDF serialization from HTML files
 * and announce the presence of them by media type.
 */
export class ActorRdfParseHtmlScript extends ActorRdfParseFixedMediaTypes {

  public mediatorRdfParse: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext):
    Promise<IActorRdfParseOutput> {

    const quads = new Readable({objectMode: true});

    quads._read = async () => {

      // Stringify HTML input
      const htmlString: string = await require('stream-to-string')(action.input);

      // Fetch the supported types
      const supportedTypes: string[] = Object.keys((await this.mediatorRdfParse
        .mediate({
          context,
          mediaTypes: true,
        })).mediaTypes);
      supportedTypes.push("application/ld+json");   // Add json-ld while waiting for issue 138

      let stream: Readable;
      let index: number;
      let streamOpened: boolean = false;
      let count: number = 0;
      let noRDFScriptTags: boolean = true;

      const htmlparser = require("htmlparser2");
      const parser = new htmlparser.Parser({

        onclosetag: async (tagname: string) => {
          if (tagname === "script" && index > -1) {
            streamOpened = false;
            stream.push(null);

            const parseAction = {
              context,
              handle: { input: stream },
              handleMediaType: supportedTypes[index],
            };
            const returned = (await this.mediatorRdfParse.mediate(parseAction)).handle;

            returned.quads.on('data', (chunk) => {
              quads.push(chunk);
            });

            returned.quads.on('end', () => {
              count--;
              if (count === 0) {
                quads.push(null);
              }
            });
          }
        },

        onopentag: (tagname: string, attribs: any) => {
          index = supportedTypes.indexOf(attribs.type);
          if (tagname === "script" && index > -1) {
            noRDFScriptTags = false;
            streamOpened = true;
            count++;
            stream = new Readable({ objectMode: true });
          }
        },

        ontext: (text: string) => {
          if (streamOpened) {
            stream.push(text);
          }
        },
      }, {decodeEntities: true});
      await parser.write(htmlString);
      parser.end();

      if (noRDFScriptTags) {
        quads.push(null);
      }
    };

    return { quads };
  }
}
