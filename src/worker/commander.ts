/**
 * Commander worker process
 *
 * Note: CommanderAgentManager creates the CommanderAgent directly in the
 * main process (like AcpAgentManager), so this worker file exists only
 * for ForkTask compatibility. It is not actively used.
 */
import { CommanderAgent } from '../agent/commander';
import { forkTask } from './utils';

export default forkTask(({ data }, pipe) => {
  const agent = new CommanderAgent({
    ...data,
    onStreamEvent(data) {
      pipe.call('commander.message', data);
    },
  });
  pipe.on('stop.stream', (_, deferred) => {
    deferred.with(agent.stop());
  });
  pipe.on('send.message', (data, deferred) => {
    deferred.with(agent.sendMessage(data));
  });
  return agent.start();
});
