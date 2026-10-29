import {projectSchema} from './model';
self.onmessage=(event:MessageEvent)=>{const {id,project}=event.data;const result=projectSchema.safeParse(project);self.postMessage(result.success?{id,project:result.data}:{id,issues:result.error.issues});};
