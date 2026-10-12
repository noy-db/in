import { ref, getCurrentScope, onScopeDispose, type Ref } from 'vue'
import type { Noydb, SyncStatus, PushResult, PullResult } from '@noy-db/hub'

/**
 * Return value of `useSync()`.
 *
 * Wraps the NOYDB sync engine in reactive Vue refs. `status` updates
 * automatically as sync operations progress, so binding it to a
 * status indicator (e.g. a toolbar sync icon) requires no manual polling.
 */
export interface UseSyncReturn {
  /** Reactive sync status. */
  status: Ref<SyncStatus>
  /** Whether a sync operation is in progress. */
  syncing: Ref<boolean>
  /** Push local changes to remote. */
  push: () => Promise<PushResult>
  /** Pull remote changes to local. */
  pull: () => Promise<PullResult>
  /** Bidirectional sync (pull then push). */
  sync: () => Promise<void>
  /** Remove the sync listeners. Automatic when the calling effect scope disposes. */
  stop: () => void
}

/**
 * Composable for reactive sync status and controls.
 */
export function useSync(db: Noydb, compartmentName: string): UseSyncReturn {
  const status = ref<SyncStatus>({
    dirty: 0,
    lastPush: null,
    lastPull: null,
    online: true,
  }) as Ref<SyncStatus>
  const syncing = ref(false)

  function refreshStatus(): void {
    status.value = db.syncStatus(compartmentName)
  }

  // Listen for sync events to auto-refresh status
  const onPush = () => refreshStatus()
  const onPull = () => refreshStatus()
  db.on('sync:push', onPush)
  db.on('sync:pull', onPull)

  // onScopeDispose, not onUnmounted (a no-op outside a component — Pinia
  // setup stores and plugins leaked these). Outside any scope, call stop().
  const stop = (): void => {
    db.off('sync:push', onPush)
    db.off('sync:pull', onPull)
  }
  if (getCurrentScope()) onScopeDispose(stop)

  async function push(): Promise<PushResult> {
    syncing.value = true
    try {
      const result = await db.push(compartmentName)
      refreshStatus()
      return result
    } finally {
      syncing.value = false
    }
  }

  async function pull(): Promise<PullResult> {
    syncing.value = true
    try {
      const result = await db.pull(compartmentName)
      refreshStatus()
      return result
    } finally {
      syncing.value = false
    }
  }

  async function sync(): Promise<void> {
    syncing.value = true
    try {
      await db.sync(compartmentName)
      refreshStatus()
    } finally {
      syncing.value = false
    }
  }

  // Initial status
  refreshStatus()

  return { status, syncing, push, pull, sync, stop }
}
