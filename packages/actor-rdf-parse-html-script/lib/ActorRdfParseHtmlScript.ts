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

  private readonly htmlparser: any;

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
    this.htmlparser = require("htmlparser2");
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext):
    Promise<IActorRdfParseOutput> {
    const supportedTypes: string[] = Object.keys((await this.mediatorRdfParse
      .mediate({
        context,
        mediaTypes: true,
      })).mediaTypes);
    supportedTypes.push("application/ld+json");

    const quads = new Readable({objectMode: true});
    let textStream: Readable;
    let initialized: boolean = false;
    quads._read = async () => {
      if (!initialized) {
        initialized = true;
        let mediaTypeFound: string;
        let countScriptTexts: number = 0; // amount of script-texts that have been found for parsing
        let ended: boolean = false;
        let closed: boolean = false; // after onclosetag is called, htmlparser can return an empty text in ontext
        const parser = new this.htmlparser.Parser({
          onclosetag: async () => {
            closed = true;
            if (mediaTypeFound) {
              textStream.push(null);

              // Send text to parser
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
                // When the document has been read and this is the last one, end the stream
                if (ended && --countScriptTexts === 0) {
                  quads.push(null);
                }
              });
            }
          },
          // This method gets called after running all onopentags, ontexts and onendtags
          onend: () => {
            // If all script texts are processed or none are found, end the stream
            if (countScriptTexts === 0) {
              quads.push(null);
            } else {
              ended = true;
            }
          },
          onopentag: (tagname: string, attribs: any) => {
            closed = false;
            if (tagname === "script" && supportedTypes.indexOf(attribs.type) > -1) {
              textStream = new Readable({objectMode: true});
              mediaTypeFound = attribs.type;
              countScriptTexts++;
            } else {
              mediaTypeFound = null; // the tag will not be processed in the ontext
            }
          },
          // ontext runs synchronously after onopentag
          ontext: (text: string) => {
            if (!closed && mediaTypeFound) {
              textStream.push(text);
            }
          }
        },{ decodeEntities: true});
        action.input.pipe(parser);
      }
    }

    return { quads };
  }
}
