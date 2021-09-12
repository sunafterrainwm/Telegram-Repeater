/* eslint-disable @typescript-eslint/no-explicit-any */
import moduleAlias from 'module-alias';
import path = require( 'path' );
moduleAlias.addAliases( {
	src: __dirname,
	config: path.join( __dirname, '../config' )
} );

import config from 'config/config';

import Telegraf, { Context } from 'telegraf';
import * as TT from 'telegraf/typings/telegram-types';

import winston = require( 'winston' );
import * as fs from 'fs';

// 日志初始化
const logFormat: winston.Logform.FormatWrap = winston.format( function ( info: winston.Logform.TransformableInfo ) {
	info.level = info.level.toUpperCase();
	if ( info.stack ) {
		info.message = `${ info.message }\n${ info.stack }`;
	}
	return info;
} );

winston.add( new winston.transports.Console( {
	format: winston.format.combine(
		logFormat(),
		winston.format.colorize(),
		winston.format.timestamp( {
			format: 'YYYY-MM-DD HH:mm:ss'
		} ),
		winston.format.printf( ( info ) => `${ info.timestamp } [${ info.level }] ${ info.message }` )
	)
} ) );

process.on( 'unhandledRejection', function ( _reason, promise ) {
	promise.catch( function ( e ) {
		winston.error( 'Unhandled Rejection: ', e );
	} );
} );

process.on( 'uncaughtException', function ( err ) {
	winston.error( 'Uncaught exception:', err );
} );

process.on( 'rejectionHandled', function () {
	// 忽略
} );

process.on( 'warning', ( warning ) => {
	winston.warn( warning );
} );

// 日志等级、文件设置
if ( config.logging && config.logging.level ) {
	winston.level = config.logging.level;
} else {
	winston.level = 'info';
}

if ( config.logging && config.logging.logfile ) {
	const files: winston.transports.FileTransportInstance = new winston.transports.File( {
		filename: config.logging.logfile,
		format: winston.format.combine(
			logFormat(),
			winston.format.timestamp( {
				format: 'YYYY-MM-DD HH:mm:ss'
			} ),
			winston.format.printf( function ( info ) {
				return `${ info.timestamp } [${ info.level }] ${ info.message }`;
			} )
		)
	} );
	winston.add( files );
}

winston.info( 'Telegram-Repeater: Telegram 簡易自動回覆機器人 v1.0.0' );
winston.info( '' );
winston.info( 'Starting Telegram bot...' );

const tgBot = new Telegraf<Context>( config.token );

let me: TT.User;

tgBot.telegram.getMe().then( function ( info: TT.User ) {
	me = info;

	winston.info( `TelegramBot is ready, login as: ${ info.first_name }${ info.last_name ? ` ${ info.last_name }` : '' }@${ info.username }(${ info.id })` );
} );

const ignoreRegExp = config.ignoreRegExp || {
	test() {
		return false;
	}
};

const beforeProcessText = config.beforeProcessText || function beforeProcessText() {
	return true;
};
const beforeProcess = config.beforeProcess || function beforeProcess() {
	return true;
};

const commandsTable = config.commandsTable || {};
const replacesTable = config.replacesTable || [];
const replaceFunc = config.replaceFunc || function ( text ) {
	return text;
};

const ignoreFromID = config.ignoreFromID || [];
const ignoreChatID = config.ignoreChatID || [];

let gMsgId = 0;

const startTime: number = Date.now() / 1000;

function processText( ctx: Context, text: string, msgId: number, processCmd?: boolean ): string {
	if ( !text ) {
		return '';
	}

	const info = `from: ${ ctx.from.id }, chat: ${ ctx.chat.id }, rawMsgId: ${ ctx.message.message_id }`;

	if ( beforeProcessText( text, ctx ) ) {
		winston.debug( `[msg] #${ msgId } Ignore (beforeProcessText) ${ info }` );
		return '';
	}

	if ( processCmd ) {
		const [ , cmd, , ] = text.match( /^\/([A-Za-z0-9_@]+)(\s+(.*)|\s*)$/u ) || [];
		if ( cmd ) {
			// 如果包含 Bot 名，判断是否为自己
			const [ , c, , n ] = cmd.match( /^([A-Za-z0-9_]+)(|@([A-Za-z0-9_]+))$/u ) || [];
			if ( ( n && ( n.toLowerCase() === ( me?.username || '' ).toLowerCase() ) ) || !n ) {
				if ( c in commandsTable ) {
					commandsTable[ c ]( ctx );
					winston.debug( `[cmd] #${ msgId } Fire command ${ c } (text: ${ text }) ${ info }` );
					return;
				}

				if ( config.allowCommand === 'none' ) {
					winston.debug( `[msg] #${ msgId } Ignore  (cmdSelf, text: ${ text }) ${ info }` );
					return;
				}
			} else {
				if ( config.allowCommand !== 'all' ) {
					winston.debug( `[msg] #${ msgId } Ignore (cmdOther, text: ${ text }) ${ info }` );
					return;
				}
			}
		}
	}

	if ( ignoreRegExp.test( text ) ) {
		winston.debug( `[msg] #${ msgId } Ignore (ignoreRegExp, text: ${ text }) ${ info }` );
		return;
	}

	text = replaceFunc( text, ctx );

	if ( !text ) {
		return;
	}

	replacesTable.forEach( function ( [ search, replace ] ) {
		text = text.replace( search, replace );
	} );

	return text;
}

tgBot.on( 'message', async function ( ctx ) {
	if ( ctx.message.date + 3600 /* 1hr */ < startTime ) {
		return;
	}

	const msgId: number = ++gMsgId;
	const info = `from: ${ ctx.from.id }, chat: ${ ctx.chat.id }, rawMsgId: ${ ctx.message.message_id }`;

	if ( beforeProcess( ctx ) ) {
		winston.debug( `[msg] #${ msgId } Ignore (beforeProcess) ${ info }` );
		return '';
	} else if ( ignoreFromID.includes( ctx.from.id ) ) {
		winston.debug( `[msg] #${ msgId } Ignore (fromId) ${ info }` );
		return;
	} else if ( ignoreChatID.includes( ctx.chat.id ) ) {
		winston.debug( `[msg] #${ msgId } Ignore (chatId) ${ info }` );
		return;
	}

	if ( 'text' in ctx.message ) {
		const replyMessage = processText( ctx, ctx.message.text, msgId, true );

		if ( replyMessage ) {
			winston.debug( `[msg] #${ msgId } reply (text: ${ replyMessage }, rawText: ${ ctx.message.text }) ${ info }` );
			try {
				await tgBot.telegram.sendMessage( ctx.chat.id, replyMessage );
			} catch ( e ) {
				if ( String( e ).match( 'have no rights to send a message' ) ) {
					tgBot.telegram.leaveChat( ctx.chat.id );
					winston.info( `[leave] bot leave group ${ ctx.chat.id } because bot was muted.` );
				} else {
					throw e;
				}
			}
		}
	} else {
		const message: TT.Message = ctx.message;

		if ( message.sticker && config.allowSticker ) {
			winston.debug( `[msg] #${ msgId } reply (sticker: ${ message.sticker.file_id }) ${ info }` );
			try {
				tgBot.telegram.sendSticker( ctx.chat.id, message.sticker.file_id );
			} catch ( e ) {
				if ( String( e ).match( 'have no rights to send a message' ) ) {
					winston.info( `[leave] bot leave group ${ ctx.chat.id } because bot was muted.` );
					tgBot.telegram.leaveChat( ctx.chat.id );
				} else {
					throw e;
				}
			}
		} else if ( (
			message.photo ||
			message.audio ||
			message.voice ||
			message.video ||
			message.document
		) && config.allowMedia ) {
			let caption: string;
			if ( message.caption ) {
				caption = processText( ctx, message.caption, msgId, true );
				if ( !caption ) {
					return;
				}
			}

			let promise: Promise<any>;
			if ( message.photo ) {
				let sz = 0;
				let photoId: string;
				for ( const p of message.photo ) {
					if ( p.file_size > sz ) {
						sz = p.file_size;
						photoId = p.file_id;
					}
				}

				promise = tgBot.telegram.sendPhoto( ctx.chat.id, photoId, {
					caption: caption
				} );
				winston.debug( `[msg] #${ msgId } reply (photo: ${ photoId }) ${ info }` );
			} else if ( message.audio ) {
				promise = tgBot.telegram.sendAudio( ctx.chat.id, message.audio.file_id, {
					caption: caption
				} );
				winston.debug( `[msg] #${ msgId } reply (audio: ${ message.audio.file_id }) ${ info }` );
			} else if ( message.voice ) {
				promise = tgBot.telegram.sendVideo( ctx.chat.id, message.voice.file_id, {
					caption: caption
				} );
				winston.debug( `[msg] #${ msgId } reply (voice: ${ message.voice.file_id }) ${ info }` );
			} else if ( message.video ) {
				promise = tgBot.telegram.sendVideo( ctx.chat.id, message.video.file_id, {
					caption: caption
				} );
				winston.debug( `[msg] #${ msgId } reply (video: ${ message.video.file_id }) ${ info }` );
			} else if ( message.document ) {
				promise = tgBot.telegram.sendDocument( ctx.chat.id, message.document.file_id, {
					caption: caption
				} );
				winston.debug( `[msg] #${ msgId } reply (document: ${ message.document.file_id }) ${ info }` );
			}

			try {
				await promise;
			} catch ( e ) {
				if ( String( e ).match( 'have no rights to send a message' ) ) {
					winston.info( `[leave] bot leave group ${ ctx.chat.id } because bot was muted.` );
					tgBot.telegram.leaveChat( ctx.chat.id );
				} else {
					throw e;
				}
			}
		} else {
			if ( message.new_chat_members && message.new_chat_members.map( function ( u ) {
				return u.id;
			} ).includes( me.id ) ) {
				winston.info( `[join] bot join group ${ ctx.chat.id }.` );
			}
			gMsgId--;
		}
	}
} );

if ( config.webhook && config.webhook.port > 0 ) {
	try {
		config.webhook.url = new URL( config.webhook.url ).href;
	} catch ( e ) {
		winston.error( `Can't parse webhook url: ${ e }` );
		// eslint-disable-next-line no-process-exit
		process.exit( 1 );
	}

	// 自动设置Webhook网址
	if ( config.webhook.url ) {
		if ( config.webhook.ssl?.certPath ) {
			tgBot.telegram.setWebhook( config.webhook.url, {
				certificate: {
					source: config.webhook.ssl.certPath
				}
			} );
		} else {
			tgBot.telegram.setWebhook( config.webhook.url );
		}
	}

	// 启动Webhook服务器
	if ( !config.webhook.tlsOptions && config.webhook.ssl && config.webhook.ssl.certPath ) {
		config.webhook.tlsOptions = {
			key: fs.readFileSync( config.webhook.ssl.keyPath ),
			cert: fs.readFileSync( config.webhook.ssl.certPath )
		};
		if ( config.webhook.ssl.caPath ) {
			config.webhook.tlsOptions.ca = [
				fs.readFileSync( config.webhook.ssl.caPath )
			];
		}
	}

	tgBot.launch( {
		webhook: config.webhook
	} ).then( function () {
		winston.info( `Telegram bot has started at ${ config.webhook.url }.` );
	} );
} else {
	tgBot.launch( {
		polling: config.polling
	} ).then( function () {
		winston.info( 'Telegram bot has started.' );
	} );
}
