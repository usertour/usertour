import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway as WsGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WebSocketService } from './web-socket.service';

@WsGateway()
export class WebSocketGateway {
  constructor(private service: WebSocketService) {}
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('get-config')
  async getConfig(@MessageBody() body: any): Promise<any> {
    return await this.service.getConfig(body);
  }

  @SubscribeMessage('list-contents')
  async listContent(@MessageBody() body: any): Promise<any> {
    return await this.service.listContent(body);
  }

  @SubscribeMessage('list-themes')
  async listThemes(@MessageBody() body: any): Promise<any> {
    return await this.service.listThemes(body);
  }

  @SubscribeMessage('identity')
  async identity(@MessageBody() data: number): Promise<number> {
    return data;
  }

  @SubscribeMessage('upsert-user')
  async upsertBizUsers(@MessageBody() body: any): Promise<any> {
    return await this.service.upsertBizUsers(body);
  }

  @SubscribeMessage('upsert-company')
  async upsertBizCompanies(@MessageBody() body: any): Promise<any> {
    return await this.service.upsertBizCompanies(body);
  }

  @SubscribeMessage('create-session')
  async createSession(@MessageBody() body: any): Promise<any> {
    return await this.service.createSession(body);
  }

  @SubscribeMessage('track-event')
  async sendEvent(@MessageBody() body: any): Promise<any> {
    return await this.service.trackEvent(body);
  }
}
