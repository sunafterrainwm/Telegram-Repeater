import { Telegraf, Context as TContext } from 'telegraf';
import { MESSAGE } from 'triple-beam';
import winston from 'winston';
import TransportStream, { TransportStreamOptions } from 'winston-transport';

export interface LogToChannelOptions extends TransportStreamOptions {
	telegraf: Telegraf<TContext>;
	logChannel: number;
}

class LogToChannelError extends Error {
	constructor( message?: string ) {
		super( message );
		this.name = 'LogToChannelError';
	}
}

export class LogToChannel extends TransportStream {
	#telegraf: Telegraf<TContext>;
	#logChannel: number;
	constructor( options: LogToChannelOptions ) {
		super( options );
		this.#telegraf = options.telegraf;
		this.#logChannel = options.logChannel;
	}
	log( info: unknown, callback: () => void ): void {
		let logText: string;
		try {
			const printData: {
				level: string;
				message: string;
			} = JSON.parse( info[ MESSAGE ] );

			logText = `[${ printData.level }] ${ printData.message }`;
		} catch {
			// eslint-disable-next-line no-control-regex
			logText = info[ MESSAGE ].replace( /\x1b\[\d+m/g, '' );
		}
		// remove bot token
		logText.replace( this.#telegraf.token, '<token>' );
		if ( !logText.includes( 'LogToChannelError' ) ) {
			this.#telegraf.telegram.sendMessage( this.#logChannel, logText ).catch( function ( err ) {
				winston.error( new LogToChannelError( err ) );
			} );
		}
		if ( callback ) {
			callback();
		}
	}
}

export {
	LogToChannel as default
};
