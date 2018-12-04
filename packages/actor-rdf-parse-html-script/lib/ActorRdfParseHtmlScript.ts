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
 * It is able to extract and parse any RDF serialization from script tags in HTML files
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
    const supportedTypes: string[] = Object.keys((await this.mediatorRdfParse
        .mediate({
            context,
            mediaTypes: true,
        })).mediaTypes);
    supportedTypes.push("application/ld+json");

    const htmlparser = require("htmlparser2");

    const quads = new Readable({objectMode: true});
    const textStream = new Readable({objectMode: true});

    let initialized = false;
    quads._read = async () => {
      if (!initialized) {
        initialized = true;
        let rdfScriptTagFound: boolean = false;
        let mediaTypeFound: string;
        let countScriptTexts = 0; // amount of script-texts that have been found for parsing

        const parser = new htmlparser.Parser({
          onclosetag: async (tagname: string) => {
            if (rdfScriptTagFound) {
              textStream.push(null);
            }
          },
          onopentag: (tagname: string, attribs: any) => {
            if (tagname === "script" && supportedTypes.indexOf(attribs.type) > -1) {
              rdfScriptTagFound = true;
              mediaTypeFound = attribs.type;
              countScriptTexts++;
            } else {
              rdfScriptTagFound = false;
            }
          },
          ontext: async (text: string) => {
            if (rdfScriptTagFound) {
              textStream.push(text);

              const parseAction = {
                context,
                handle: {baseIRI: action.baseIRI, input: textStream},
                handleMediaType: mediaTypeFound,
              };
              const returned = (await this.mediatorRdfParse.mediate(parseAction)).handle;
              returned.quads.on('data', (chunk: any) => {
                quads.push(chunk);
              });
              returned.quads.on('end', () => {
                countScriptTexts--;
                if (!countScriptTexts) {
                  quads.push(null);
                }
              });
            }
          }, decodeEntities: true
        });
        action.input.pipe(parser);
      }
    };

    return {quads};
  }
}
