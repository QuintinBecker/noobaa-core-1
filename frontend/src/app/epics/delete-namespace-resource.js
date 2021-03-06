/* Copyright (C) 2016 NooBaa */

import { mergeMap } from 'rxjs/operators';
import { ofType } from 'rx-extensions';
import { mapErrorObject } from 'utils/state-utils';
import { DELETE_NAMESPACE_RESOURCE } from 'action-types';
import { completeDeleteNamespaceResource, failDeleteNamespaceResource } from 'action-creators';

export default function(action$, { api }) {
    return action$.pipe(
        ofType(DELETE_NAMESPACE_RESOURCE),
        mergeMap(async action => {
            const { name } = action.payload;

            try {
                await api.pool.delete_namespace_resource({ name });
                return completeDeleteNamespaceResource(name);

            } catch (error) {
                return failDeleteNamespaceResource(
                    name,
                    mapErrorObject(error)
                );
            }
        })
    );
}
