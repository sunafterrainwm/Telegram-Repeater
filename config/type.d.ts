import { Context } from 'telegraf';
import { LaunchPollingOptions, LaunchWebhookOptions } from 'telegraf/typings/telegraf';

export interface ConfigTS {
	/**
	 * Telegram token
	 */
	token: string;

	polling?: LaunchPollingOptions;

	webhook?: LaunchWebhookOptions & {
		/**
		 * Webhook 最終的完整 URL，可被外部存取，用於呼叫 Telegram 介面自動設定網址
		 */
		url?: string;

		ssl?: {
			certPath: string;
			keyPath: string;
			caPath: string;
		}
	};

	/**
	 * 是否回覆貼圖
	 */
	allowSticker: boolean;

	/**
	 * 是否回覆檔案
	 */
	allowMedia: boolean;

	/**
	 * 是否回覆指令
	 *
	 * none：全部皆不回覆
	 * self：只回覆自己的／沒指定對象的
	 * all：全部皆回覆
	 */
	allowCommand: 'none' | 'self' | 'all';

	/**
	 * 無視這些人傳的東西
	 */
	ignoreFromID?: number[];

	/**
	 * 無視這些群組傳的東西
	 */
	ignoreChatID?: number[];

	/**
	 * 只要訊息符合條件就不回覆
	 */
	ignoreRegExp?: RegExp;

	/**
	 * 把回覆的內容給替換掉
	 */
	replacesTable?: [ string | RegExp, string ][];

	/**
	 * 指令的處理方式
	 */
	commandsTable?: Record<string, ( ctx: Context ) => void>;

	/**
	 * 系統紀錄檔
	 */
	logging: {
		/**
		 * 紀錄檔等級：從詳細到簡單分別是 debug、info、warning、error，推薦用 info
		 */
		level: 'debug' | 'info' | 'warning' | 'error';

		/**
		 * 紀錄檔檔名，如留空則只向螢幕輸出
		 */
		logfile: string;
	};
}
