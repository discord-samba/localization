/* eslint-disable */

import * as Path from 'path';
import { Localization } from '../Localization';

Localization.loadLangFile('test', Path.join(__dirname, 'locale/manual/manual.lang'));

try { Localization.resource('test', 'test3'); }
catch (err) { console.log(err.stack); }

try { Localization.resource('test', 'test6'); }
catch (err) { console.log(err.stack); }
