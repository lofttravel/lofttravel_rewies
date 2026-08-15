import fs from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { config } from './config.mjs';
import { sha256 } from './lib/text.mjs';

const [outputText, schema, manifest] = await Promise.all([
  fs.readFile(config.outputFile, 'utf8'),
  fs.readFile(config.schemaFile, 'utf8').then(JSON.parse),
  fs.readFile(config.manifestFile, 'utf8').then(JSON.parse)
]);
const feed = JSON.parse(outputText);
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(feed)) throw new Error(JSON.stringify(validate.errors, null, 2));
if (sha256(outputText) !== manifest.sha256) throw new Error('manifest checksum mismatch');
console.log(`valid: ${feed.stats.total} reviews`);
