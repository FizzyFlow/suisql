
export default class SuiSqlLog  {

    static _debug = false;

	static switch(onOff: boolean) {
		SuiSqlLog._debug = onOff;
	}

	static log(...args: any[]) {
		if (!SuiSqlLog._debug) {
			return;
		}

		let prefix = 'SuiSql | ';

		args.unshift(prefix);
		console.info.apply(null, args);
	}
};