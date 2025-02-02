/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';

// @ts-ignore
import { checkFullLicense } from '../../../license/check_license';
import { checkGetJobsPrivilege } from '../../../privilege/check_privilege';
import { loadMlServerInfo } from '../../../services/ml_server_info';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import {
  loadCurrentIndexPattern,
  loadCurrentSavedSearch,
  // @ts-ignore
} from '../../../util/index_utils';
import { getDataFrameAnalyticsBreadcrumbs } from '../../breadcrumbs';

const template = `<ml-data-frame-analytics-management />`;

uiRoutes.when('/data_frame_analytics/?', {
  template,
  k7Breadcrumbs: getDataFrameAnalyticsBreadcrumbs,
  resolve: {
    CheckLicense: checkFullLicense,
    privileges: checkGetJobsPrivilege,
    indexPattern: loadCurrentIndexPattern,
    savedSearch: loadCurrentSavedSearch,
    mlNodeCount: getMlNodeCount,
    loadMlServerInfo,
  },
});
