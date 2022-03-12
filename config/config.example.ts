import { ConfigTS } from 'config/type';
import path = require( 'path' );

/*
 * 機器人的設定檔
 *
 * 請參照註釋進行設定。設定好之後，請將檔案更名為 config.ts
 */

const config: ConfigTS = {
	token: '', // BotFather 給你的 Token，類似「123456789:q234fipjfjaewkflASDFASjaslkdf」

	polling: { // 使用輪巡
		timeout: 30, // 報超時的秒數
		limit: 100 // 限定檢索的訊息數
	},

	webhook: { // 使用 webhook
		port: 0, // Webhook 埠，為 0 時不啟用 Webhook
		hookPath: '', // Webhook 路徑
		url: '', // Webhook 最終的完整 URL，可被外部存取，用於呼叫 Telegram 介面自動設定網址
		ssl: {
			certPath: '', // SSL 憑證，為空時使用 HTTP 協定
			keyPath: '', // SSL 金鑰
			caPath: '' // 如使用自簽章憑證，CA 憑證路徑
		}
	},

	// 是否回覆貼圖
	allowSticker: true,

	// 是否回覆檔案
	allowMedia: true,

	// 是否回覆指令
	// none：全部皆不回覆
	// self：只回覆自己的／沒指定對象的
	// all：全部皆回覆
	allowCommand: 'self',

	ignoreFromID: [
		777000, // 無視 777000 這個人傳的東西
		1087968824
		// PS: 777000 = Telegram（頻道傳的）, 1087968824 = GroupAnonymousBot（匿名管理員傳的）
	],

	ignoreChatID: [
		-100123456789 // 無視 -100123456789 這個群組傳的東西
	],

	// 當檢測到被禁言（無法成功發言且錯誤理由為被限制）時是否自動退出
	exitWhenRestrict: true,

	// 當設定禁言自動退出時永遠不退出的名單
	exitWhiteChatID: [
		-1001234567890
	],

	ignoreRegExp: /^\(NOMO\)/, // 只要訊息符合條件就不回覆

	// 把回覆的內容給替換掉
	replacesTable: [
		[ /@[a-zA-Z0-9_]+[ ]?/, '<ping>' ], // 例如：阻止ping
		[ /^.*anyone.*$/, '沒有人，你悲劇了。' ] // 例如：整行替換
	],

	// 處理指令
	commandsTable: {
		start: function ( ctx ) {
			ctx.tg.sendMessage( ctx.chat.id, '你好，本機器人會自動回覆你說的話，支援貼圖及檔案，若在開頭加上<code>(NOMO)</code>則不會回覆。', {
				parse_mode: 'HTML'
			} );
		},
		ping: function ( ctx ) {
			ctx.tg.sendMessage( ctx.chat.id, 'pong!', {
				parse_mode: 'HTML'
			} );
		}
	},

	logging: {
		/**
		 * 紀錄檔等級：從詳細到簡單分別是 debug、info、warning、error，推薦用 info
		 */
		level: 'debug',

		/**
		 * 紀錄檔檔名，如留空則只向螢幕輸出
		 */
		logfile: path.join( __dirname, '../logs/run.log' )
	}
};

export default config;
