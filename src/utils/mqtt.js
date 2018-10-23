import Paho from 'paho-mqtt'
import uuidv1 from 'uuid/v1'
import { mqttForm } from '../config'

const globalData = {
  client: false,
  onMessageArrived: {}, // 保存已经存在的topic集合
  subscribed: {}, // 保存已经订阅的topic信息集合
}
const core = {
  sub: (client, topic, qos = 1) => {
    if (!client || !client.isConnected()) return false;
    return new Promise((resolve, reject) => {
      const timeOut = setTimeout(() => {
        reject(`[mqtt][subscribe] timeout at ${JSON.stringify(globalData)}`);
      }, 10000);

      console.log(`[mqtt][subscribe] ready to sub ${topic} `);
      client.subscribe(topic, {
        qos,
        onFailure(err) {
          console.error('[mqtt][subscribe] fail!', err);
          reject(err);
        },
        onSuccess() {
          console.log('[mqtt][subscribe] success!');
          clearTimeout(timeOut);
          globalData.subscribed[topic] = qos;
          resolve();
        }
      });
    });
  },
  unSub: (client, topic) => {
    if (!client || !client.isConnected()) return false;
    if (!globalData.subscribed[topic]) return true;
    return new Promise((resolve, reject) => {
      console.log(`[mqtt][unsubscribe] ready to sub ${topic}!`);
      client.unsubscribe(topic, {
        timeout: 6000,
        onFailure(err) {
          console.error('[mqtt][unsubscribe] fail!', err);
          reject(err);
        },
        onSuccess() {
          console.log('[mqtt][unsubscribe] success!', globalData);
          delete globalData.onMessageArrived[topic];
          delete globalData.subscribed[topic];
          resolve();
        }
      });
    });
  },
  onMessageArrived: (msg) => {
    const topic = msg.topic;
    const _onMessage = globalData.onMessageArrived[topic];
    if (_onMessage == null || typeof _onMessage !== 'function') {
      return console.warn(`_onMessage[${topic}] is error ${JSON.stringify(globalData)}`);
    }
    return _onMessage(msg);
  },
  onConnectionLost: (res) => {
    console.error(`[mqtt]: onConnectionLost [${res.errorCode}][${res.errorMessage}]`);
    let flag = false;
    setTimeout(async () => {
      await core.init(mqttForm.host, mqttForm.port, mqttForm.username, mqttForm.password);
      if (core.isConnected) flag = true;
    }, 5000);
    setTimeout(() => {
      if (!flag) core.init(mqttForm.host, mqttForm.port, mqttForm.username, mqttForm.password);
    }, 10000);
  },
  resub: (client, subscribed = {}) => {
    if (!core.isConnected(client)) return console.warn('[mqtt] client is not online!');
    const topics = Object.keys(subscribed);
    if (topics.length === 0) return
    topics.forEach((topic) => core.sub(client, topic, subscribed[topic]));
  },
  init: (host, port, userName, password) => {
    console.log(' [mqtt]: init ', globalData);
    if (globalData.client && globalData.client.isConnected()) return console.log(' [mqtt]: has been connected ', globalData);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject('[mqtt][init] connect timeout!', globalData)
      }, 10000);
      const client = new Paho.Client(host, port, uuidv1());
      client.connect({
        useSSL: true, cleanSession: true, keepAliveInterval: 200,
        userName: userName,
        password: password,
        reconnect: true,
        onSuccess: () => {
          console.log('[mqtt]: connecte success! ');
          client.onConnectionLost = core.onConnectionLost;
          client.onMessageArrived = core.onMessageArrived;
          globalData.client = client;
          core.resub(client, globalData.subscribed);
          clearTimeout(timeout);
          resolve();
        },
        onFailure: (error) => {
          console.error(` [mqtt]: connecte failure at [${error}]`);
          reject(error);
        },
      });
    })
  },
  disconnect: (client) => {
    if (client && client.isConnected()) {
      console.log('disconnect success');
      client.disconnect()
    }
  },
  isConnected: (client) => {
    return client && client.isConnected();
  }
}

const mqtt = {
  subscribe: (topic, qos = 1) => {
    const client = globalData.client;
    if (core.isConnected(client)) return core.sub(client, topic, qos);
    return console.warn('[mqtt] client is not online!');
  },
  unsubscribe: (topic) => {
    const client = globalData.client;
    if (core.isConnected(client)) return core.unSub(client, topic);
    return console.warn('[mqtt] client is not online!');
  },
  setOnMessageArrived: (topic, onMessageArrived, parent) => {
    if (onMessageArrived == undefined || typeof onMessageArrived !== 'function') return;
    globalData.onMessageArrived[topic] = onMessageArrived.bind(parent);
  },
  init: () => core.init(mqttForm.host, mqttForm.port, mqttForm.username, mqttForm.password),
  getClient: () => globalData.client,
  disconnect: () => core.disconnect(globalData.client),
  isConnected: () => core.isConnected(globalData.client),
}

export default mqtt
