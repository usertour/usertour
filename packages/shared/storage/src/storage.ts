type Storage_Type = "localStorage" | "sessionStorage";

export interface StorageDataShape {
  value: unknown;
  time: number;
  expire: number;
}

export class AppStorage {
  prefix: string = "TOURLY_STORAGE@0.0.1";
  defaultExpire: number = 5;

  constructor(prefix?: string, defaultExpire?: number) {
    if (prefix != undefined) {
      this.prefix = prefix;
    }
    if (defaultExpire != undefined) {
      this.defaultExpire = defaultExpire;
    }
  }

  private autoAddPrefix(key: string): string {
    return `${this.prefix}/${key}`;
  }

  private setStorage = (
    type: Storage_Type,
    key: string,
    value: unknown,
    expire: number = -1
  ): void => {
    if (value == "" || value == undefined) {
      value = null;
    }
    if (isNaN(expire)) {
      expire = this.defaultExpire;
    }

    let data: StorageDataShape = {
      value: value,
      time: Date.now(),
      expire,
    };

    try {
      const stringifyData = JSON.stringify(data);
      window[type].setItem(this.autoAddPrefix(key), stringifyData);
    } catch (e) {
      console.error(`[APP_STORAGE] setStorage error: ${e}`);
    }
  };

  private getStorage = (type: Storage_Type, key: string): unknown => {
    const prefixKey = this.autoAddPrefix(key);
    if (!window[type].getItem(prefixKey)) {
      return undefined;
    }
    let storage: StorageDataShape | undefined = undefined;
    try {
      const stringifyData = window[type].getItem(prefixKey);
      if (stringifyData == undefined) {
        return undefined;
      }
      storage = JSON.parse(stringifyData);
    } catch (e) {
      console.error(`[APP_STORAGE] getStorage error: ${e}`);
      return undefined;
    }

    let nowTime = Date.now();

    if (storage == undefined) {
      return undefined;
    }

    if (
      storage.expire > -1 &&
      storage.expire * 60 * 1000 < nowTime - storage.time
    ) {
      this.removeStorage(type, key);
      return undefined;
    } else {
      this.setStorage(type, key, storage.value, storage.expire);
      return storage.value;
    }
  };

  private clearStorage = (type: Storage_Type) => {
    window[type].clear();
  };

  private removeStorage = (type: Storage_Type, key: string) => {
    window[type].removeItem(this.autoAddPrefix(key));
  };

  public setLocalStorage = (key: string, value: unknown, expire?: number) => {
    this.setStorage("localStorage", key, value, expire);
  };

  public getLocalStorage = (key: string): unknown => {
    return this.getStorage("localStorage", key);
  };

  public clearLocalStorage = () => {
    this.clearStorage("localStorage");
  };

  public removeLocalStorage = (key: string) => {
    this.removeStorage("localStorage", key);
  };

  public setSessionStorage = (key: string, value: unknown, expire?: number) => {
    this.setStorage("sessionStorage", key, value, expire);
  };

  public getSessionStorage = (key: string): unknown => {
    return this.getStorage("sessionStorage", key);
  };

  public clearSessionStorage = () => {
    this.clearStorage("sessionStorage");
  };

  public removeSessionStorage = (key: string) => {
    this.removeStorage("sessionStorage", key);
  };
}
