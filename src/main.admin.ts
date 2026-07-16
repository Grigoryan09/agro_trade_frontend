import { bootstrapApplication } from '@angular/platform-browser';
import { adminAppConfig } from './app/app.admin.config';
import { App } from './app/app';

bootstrapApplication(App, adminAppConfig).catch((err) => console.error(err));
