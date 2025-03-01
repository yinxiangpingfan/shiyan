import { defineStore } from 'pinia';
import { type Message, type MessageList } from '@/stores/interface/index'
import { type AndroidNotification, NotificationsListener, type NotificationsListenerPlugin, type ListenerOptions } from 'capacitor-notifications-listener';
import { type ExtendedNotification } from '@/stores/interface/index'
import { ref, toRef } from 'vue';
import axios from 'axios';
import useUserStore from './user';

export const useMessageStore = defineStore('message', {
  state: () => ({
    // 用于存储接收到的通知
    receivedNotifications: ref<ExtendedNotification[]>([]),
  }),
  actions: {
    getMessageById(id: number) {
      return this.receivedNotifications.find(n => parseInt(n.uniqueId) === id)
    },
    fetchNotification() {
      const userStore = useUserStore();
      const systemNotificationListener: NotificationsListenerPlugin = NotificationsListener;
      const options: ListenerOptions = {
        cacheNotifications: true // 请求通知缓存权限
      };
      // 检查是否已经在监听通知
      systemNotificationListener.isListening().then((result) => {
        if (!result.value) {
          // 显示权限屏幕
          systemNotificationListener.requestPermission();
        }
      }).catch((error) => {
        console.error('Error checking if notification listener is active:', error);
      });

      // 生成唯一 ID 的辅助函数
      let uniqueCounter = 0;
      const generateUniqueId = (): string => {
        return `${Date.now()}-${uniqueCounter++}`;
      };
      //关闭监听器
      // const closeListener = ()=>{
      //   // options.cacheNotifications=false;
      //   systemNotificationListener.stopListening;
      // }

      // 初始化监听器
      systemNotificationListener.startListening(options);

      let colorId = 0;

      // 添加通知接收和移除事件监听器
      systemNotificationListener.addListener("notificationReceivedEvent", async (notification: AndroidNotification) => {
        const uniqueId = generateUniqueId();

        // try {
        //   const responseAdd = await axios.post('http://39.102.214.115:8888/data/add',
        //     {}, // 请求体数据，这里假设为空对象，根据需要修改
        //     {
        //       headers: { // 配置对象中的headers属性
        //         'telephone': userStore.telephone,
        //         'password': userStore.password
        //       }
        //     });

        //   const response = await axios.post('http://39.102.214.115:8888/ai/run',
        //     { text: notification.text }, // 请求体数据，这里假设为空对象，根据需要修改
        //     {
        //       headers: { // 配置对象中的headers属性
        //         'telephone': userStore.telephone,
        //         'password': userStore.password
        //       }
        //     });


        //   const result = response.data;

        //   if (result.code === 0) {
        //     console.log('Operation succeeded:', result);
        //     colorId = result.type_id;
        //     // 成功时的操作
        //   } else {
        //     console.error('Operation failed with code:', result.code);
        //     // 失败时的操作
        //   }
        // } catch (error) {
        //   console.error('Error posting data:', error);
        // }

        await axiosPost(notification)

        const extendedNotification = {...notification, uniqueId, colorId};
        // 确保通知唯一性
        if (!this.receivedNotifications.find(n => n.uniqueId === uniqueId) && extendedNotification.title !== '') {
          this.receivedNotifications.unshift(extendedNotification);

        }
      });

      // 添加通知移除事件监听器
      const notificationRemovedListener = systemNotificationListener.addListener("notificationRemovedEvent", (notification: AndroidNotification) => {
        // logic ...
      });


      async function axiosPost(notification: AndroidNotification) {
        try {

          const formDataBodyAi = new FormData();
          formDataBodyAi.append('text', notification.text)

          //http://39.102.214.115:8888/ai/run
          const response = await axios.post('http://47.104.150.153:7000/ai/run',
            // { text: notification.text }, // 请求体数据
            formDataBodyAi,
            {
              headers: { // 配置对象中的headers属性
                'telephone': userStore.telephone,
                'password': userStore.password
              }
            });


          const result = response.data;
          const type = result.type;

          const formDataBodyAdd = new FormData();
          formDataBodyAdd.append('package', notification.package)
          formDataBodyAdd.append('type', type)
          formDataBodyAdd.append('telephone', userStore.telephone)
          formDataBodyAdd.append('text', notification.text)

          //http://39.102.214.115:8888/data/add
          const responseAdd = await axios.post('http://47.104.150.153:7000/data/add',
            // {
            //   package: notification.package,
            //   type: type,
            //   telephone: userStore.telephone,
            //   text: notification.text,
            // }, // 请求体数据
            formDataBodyAdd,
            {
              headers: { // 配置对象中的headers属性
                'telephone': userStore.telephone,
                'password': userStore.password
              }
            });

          if (result.code === 0) {
            console.log('Operation succeeded:', result);
            colorId = result.type_id;
            // 成功时的操作
          } else {
            console.error('Operation failed with code:', result.code);
            // 失败时的操作
          }
        } catch (error) {
          console.error('Error posting data:', error);
        }
      }


      function stop() {
        systemNotificationListener.stopListening();
        systemNotificationListener.removeAllListeners();
      };

      return stop;
    },
    removeNotification(uniqueId: string) {
      // 找到索引并移除通知
      const index = this.receivedNotifications.findIndex(n => n.uniqueId === uniqueId);
      if (index !== -1) {
        this.receivedNotifications.splice(index, 1);
      }
    },
    changeNotificationColor(uniqueId: string, color: 'info' | 'warning' | 'error') {
      // 更新指定通知的颜色
      const notification = this.receivedNotifications.find(n => n.uniqueId === uniqueId);
      if (notification) {
        notification.color = color;
      }
    }
  }
});