# gazette-theme-chassis

Chassis is the Gazette world used by DAO Studio. Made systems have legible boundaries and leave room for others to act. Cool machined surfaces hold contained light while each product keeps its own purpose and availability. [WORLD.md](WORLD.md) records the accepted opening, nine axes, page ranges and motifs still to draw.

[![DAO Studio Home with native Chassis motion](docs/preview.gif)](https://daostudio.in/)

The [presentation package](presentation.toml) extends `gazette-theme-base` using the `chassis` values from `design-tokens`. Base owns shared behavior; the world supplies presentation, and the workspace supplies words, media and destinations. [Compositions](docs/compositions.md) describes the selectors, authoring forms and source bindings.

## Build and check

Bind `theme:chassis`, `theme:base` and the resources declared in `presentation.toml` in a Gazette workspace. Gazette’s `docs/theme-reference.md` describes the engine contract; Base’s `docs/start-a-world.md` describes fixture bindings and its README gives the shared verification command. This package is not a standalone site.

Change values at `design-tokens`, then run its `npm run build`, `npm run capture` and `npm run check:captures`. [Token provenance](tokens/SOURCE.md) and [font provenance](fonts/SOURCE.md) record captured inputs and licences. The delivered display, reading and system faces are WOFF2 resources.

Inspect all directional poses and the complete owl above its copy on handhelds, including reduced motion and the resting image. Run the neutral relationship fixture when those forms change; check whole-relation conditions in narrow and print layouts. Cover light and dark, normal and reduced motion, wide and handheld layouts, opened controls and print. A successful build establishes neither visual continuity nor design acceptance. Start with [AGENTS.md](AGENTS.md).

## Licence

Chassis is licensed under the MIT License with an attribution term: a site built with it keeps a footer credit stating that it was made using Gazette, such as "Made using Gazette", linking to [rawthoughts.in/gazette](https://rawthoughts.in/gazette/), and a link to this repository. [LICENSE](LICENSE) gives the full terms and the files that keep their own. The fonts are under the SIL Open Font License 1.1, with each family's licence in [fonts](fonts/).

The preview shows content from the publication this world was made for, which this repository does not license: footage and artwork purchased from a vendor under licence, and the portrait and publication art of [Harsh](https://getharsh.in). All rights reserved; not for reuse from this repository.
