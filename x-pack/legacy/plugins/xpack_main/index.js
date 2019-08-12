/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import dedent from 'dedent';
import {
  XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING,
  XPACK_INFO_API_DEFAULT_POLL_FREQUENCY_IN_MILLIS
} from '../../server/lib/constants';
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { replaceInjectedVars } from './server/lib/replace_injected_vars';
import { setupXPackMain } from './server/lib/setup_xpack_main';
import {
  xpackInfoRoute,
  featuresRoute,
  settingsRoute,
} from './server/routes/api/v1';
import { i18n } from '@kbn/i18n';

import { registerOssFeatures } from './server/lib/register_oss_features';
import { uiCapabilitiesForFeatures } from './server/lib/ui_capabilities_for_features';
import { has } from 'lodash';

function movedToTelemetry(configPath) {
  return (settings, log) => {
    if (has(settings, configPath)) {
      log(`Config key ${configPath} is deprecated. Use "xpack.telemetry.${configPath}" instead.`);
    }
  };
}

export { callClusterFactory } from './server/lib/call_cluster_factory';
export const xpackMain = (kibana) => {
  return new kibana.Plugin({
    id: 'xpack_main',
    configPrefix: 'xpack.xpack_main',
    publicDir: resolve(__dirname, 'public'),
    require: ['elasticsearch'],

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        telemetry: Joi.object({
          config: Joi.string().default(),
          enabled: Joi.boolean().default(),
          url: Joi.string().default(),
        }).default(), // deprecated
        xpack_api_polling_frequency_millis: Joi.number().default(XPACK_INFO_API_DEFAULT_POLL_FREQUENCY_IN_MILLIS),
      }).default();
    },

    uiCapabilities(server) {
      return uiCapabilitiesForFeatures(server.plugins.xpack_main);
    },

    uiExports: {
      uiSettingDefaults: {
        [XPACK_DEFAULT_ADMIN_EMAIL_UI_SETTING]: {
          name: i18n.translate('xpack.main.uiSettings.adminEmailTitle', {
            defaultMessage: 'Admin email'
          }),
          // TODO: change the description when email address is used for more things?
          description: i18n.translate('xpack.main.uiSettings.adminEmailDescription', {
            defaultMessage:
              'Recipient email address for X-Pack admin operations, such as Cluster Alert email notifications from Monitoring.'
          }),
          type: 'string', // TODO: Any way of ensuring this is a valid email address?
          value: null
        }
      },
      hacks: [
        'plugins/xpack_main/hacks/check_xpack_info_change',
      ],
      replaceInjectedVars,
      __webpackPluginProvider__(webpack) {
        return new webpack.BannerPlugin({
          banner: dedent`
            /*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
             * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */
          `,
          raw: true,
        });
      },
    },

    init(server) {
      mirrorPluginStatus(server.plugins.elasticsearch, this, 'yellow', 'red');

      setupXPackMain(server);
      const { types: savedObjectTypes } = server.savedObjects;
      registerOssFeatures(server.plugins.xpack_main.registerFeature, savedObjectTypes, server.config().get('timelion.ui.enabled'));

      // register routes
      xpackInfoRoute(server);
      settingsRoute(server, this.kbnServer);
      featuresRoute(server);
    },
    deprecations: () => [
      movedToTelemetry('telemetry.config'),
      movedToTelemetry('telemetry.url'),
      movedToTelemetry('telemetry.enabled'),
    ],
  });
};