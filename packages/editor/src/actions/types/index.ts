// Side-effect barrel. Each schema module calls registerActionSchema() at
// module-load time, so importing this file once is enough to populate the
// registry. Empty exports keep the file usable as a regular ES module.
//
// Stages append imports here as schemas are ported:
//   Stage 18C — dismiss variants (4)
//   Stage 18D — javascript-evaluate
//   Stage 18E — page-navigate
//   Stage 18F — step-goto
//   Stage 18G — flow-start

import './flow-dismiss';
import './launcher-dismiss';
import './checklist-dismiss';
import './banner-dismiss';
import './javascript-evaluate';
import './page-navigate';
import './step-goto';
import './flow-start';
