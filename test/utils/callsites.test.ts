import path from 'node:path';
import test from 'ava';
import callsites from "../../lib/utils/callsites";

test('main', t => {
	t.is(path.basename(callsites()[0].getFileName()), 'test.js');
});

test('nested', t => {
	const g = () => callsites();
	const f = () => g();

	const sites = f().slice(0, 3).map(site => ({
		fileName: site.getFileName(),
		functionName: site.getFunctionName(),
	}));

	const filename = import.meta.url.toString();

	t.deepEqual(sites, [
		{fileName: filename, functionName: 'g'},
		{fileName: filename, functionName: 'f'},
		{fileName: filename, functionName: null},
	]);
});

import {expectType} from 'tsd';
import callsites, {CallSite} from './index.js';

const callsite = callsites()[0];

expectType<CallSite[]>(callsites());
expectType<unknown | undefined>(callsite.getThis());
expectType<string | null>(callsite.getTypeName());
expectType<string | null>(callsite.getFunctionName());
expectType<string | undefined>(callsite.getMethodName());
expectType<string | null>(callsite.getFileName());
expectType<number | null>(callsite.getLineNumber());
expectType<number | null>(callsite.getColumnNumber());
expectType<string | undefined>(callsite.getEvalOrigin());
expectType<boolean>(callsite.isToplevel());
expectType<boolean>(callsite.isEval());
expectType<boolean>(callsite.isNative());
expectType<boolean>(callsite.isConstructor());
expectType<boolean>(callsite.isAsync());
expectType<boolean>(callsite.isPromiseAll());
expectType<number | null>(callsite.getPromiseIndex());

