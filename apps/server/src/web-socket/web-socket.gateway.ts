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
  async listContents(@MessageBody() body: any): Promise<any> {
    return await this.service.listContents(body);
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

  @SubscribeMessage('list-enabled-integrations')
  async listEnabledIntegrations(@MessageBody() body: any): Promise<any> {
    return await this.service.listEnabledIntegrations(body);
  }

  // @SubscribeMessage("list-attributes")
  // async listAttributes(@MessageBody() body: any): Promise<any> {
  //   return await this.service.listAttributes(body);
  // }

  // @SubscribeMessage("list-segments")
  // async listBizUserSegments(@MessageBody() body: any): Promise<any> {
  //   return await this.service.listBizUserSegments(body);
  // }
}
