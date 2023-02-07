import React, { useState, useEffect } from 'react';
import path from 'path';
import { useDispatch } from 'react-redux';
import { get, each, cloneDeep } from 'lodash';
import { runCollectionFolder } from 'providers/ReduxStore/slices/collections/actions';
import { closeCollectionRunner } from 'providers/ReduxStore/slices/collections';
import { findItemInCollection, getTotalRequestCountInCollection } from 'utils/collections';
import { IconRefresh, IconCircleCheck, IconCircleX, IconCheck, IconX, IconRun } from '@tabler/icons';
import ResponsePane from './ResponsePane';
import StyledWrapper from './StyledWrapper';

const getRelativePath = (fullPath, pathname) => {
  let relativePath = path.relative(fullPath, pathname);
  const { dir, name } = path.parse(relativePath);
  return path.join(dir, name);
}

export default function RunnerResults({collection}) {
  const dispatch = useDispatch();
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if(!collection.runnerResult) {
      setSelectedItem(null);
    }
  }, [collection, setSelectedItem]);

  const collectionCopy = cloneDeep(collection);
  const items = cloneDeep(get(collection, 'runnerResult.items', []));
  const runnerInfo = get(collection, 'runnerResult.info', {});
  each(items, (item) => {
    const info = findItemInCollection(collectionCopy, item.uid);

    item.name = info.name;
    item.type = info.type;
    item.filename = info.filename;
    item.pathname = info.pathname;
    item.relativePath = getRelativePath(collection.pathname, info.pathname);

    if(item.status !== "error") {
      if(item.testResults) {
        const failed = item.testResults.filter((result) => result.status === 'fail');

        item.testStatus = failed.length ? 'fail' : 'pass';
      } else {
        item.testStatus = 'pass';
      }
    }
  });

  const runCollection = () => {
    dispatch(runCollectionFolder(collection.uid, null, true));
  };

  const runAgain = () => {
    dispatch(runCollectionFolder(collection.uid, runnerInfo.folderUid, runnerInfo.isRecursive));
  };

  const closeRunner = () => {
    dispatch(closeCollectionRunner({
      collectionUid: collection.uid,
    }));
  };

  const totalRequestsInCollection = getTotalRequestCountInCollection(collectionCopy);
  const passedRequests = items.filter((item) => item.status !== "error" && item.testStatus === 'pass');
  const failedRequests = items.filter((item) => item.status !== "error" && item.testStatus === 'fail');

  if(!items || !items.length) {
    return (
      <StyledWrapper className='px-4'>
        <div className='font-medium mt-6 title flex items-center'>
          Runner
          <IconRun size={20} strokeWidth={1.5} className='ml-2'/>
        </div>

        <div className='mt-6'>
          You have <span className='font-medium'>{totalRequestsInCollection}</span> requests in this collection.
        </div>

        <button type="submit" className="submit btn btn-sm btn-secondary mt-6" onClick={runCollection}>
          Run Collection
        </button>

        <button className="submit btn btn-sm btn-close mt-6 ml-3" onClick={closeRunner}>
          Close
        </button>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className='px-4'>
      <div className='font-medium mt-6 mb-4 title flex items-center'>
        Runner
        <IconRun size={20} strokeWidth={1.5} className='ml-2'/>
      </div>
      <div className='flex'>
        <div className='flex flex-col flex-1'>
          <div className="py-2 font-medium test-summary">
            Total Requests: {items.length}, Passed: {passedRequests.length}, Failed: {failedRequests.length}
          </div>
          {items.map((item) => {
            return (
              <div key={item.uid}>
                <div className="item-path mt-2">
                  <div className="flex items-center">
                    <span>
                        {item.status !== "error" && item.testStatus === 'pass' ? (
                          <IconCircleCheck className="test-success" size={20} strokeWidth={1.5}/>
                        ) : (
                          <IconCircleX className="test-failure" size={20} strokeWidth={1.5}/>
                        )}
                    </span>
                    <span className={`mr-1 ml-2 ${(item.status == "error" || item.testStatus == 'fail') ? 'danger' : ''}`}>{item.relativePath}</span>
                    {(item.status !== "error" && item.status !== "completed") ? (
                      <IconRefresh className="animate-spin ml-1" size={18} strokeWidth={1.5}/>
                    ) : (
                      <span className='text-xs link cursor-pointer' onClick={() => setSelectedItem(item)}>
                        (<span className='mr-1'>
                          {get(item.responseReceived, 'status')}
                        </span>
                        <span>
                          {get(item.responseReceived, 'statusText')}
                        </span>)
                      </span>
                    )}
                  </div>
                  {item.status == "error" ? (
                    <div className="error-message pl-8 pt-2 text-xs">
                      {item.error}
                    </div>
                  ) : null }

                  <ul className="pl-8">
                    {item.testResults ? item.testResults.map((result) => (
                      <li key={result.uid} className="py-1">
                        {result.status === 'pass' ? (
                          <span className="test-success flex items-center">
                            <IconCheck size={18} strokeWidth={2} className="mr-2"/>
                            {result.description}
                          </span>
                        ) : (
                          <>
                            <span className="test-failure flex items-center">
                              <IconX size={18} strokeWidth={2} className="mr-2"/>
                              {result.description}
                            </span>
                            <span className="error-message pl-8 text-xs">
                              {result.error}
                            </span>
                          </>
                        )}
                      </li>
                    )): null}
                  </ul>
                </div>
              </div>
            );
          })}

          {runnerInfo.status === 'ended' ? (
            <div className="mt-2 mb-4">
              <button type="submit" className="submit btn btn-sm btn-secondary mt-6" onClick={runAgain}>
                Run Again
              </button>
              <button type="submit" className="submit btn btn-sm btn-secondary mt-6 ml-3" onClick={runCollection}>
                Run Collection
              </button>
              <button className="btn btn-sm btn-close mt-6 ml-3" onClick={closeRunner}>
                Close
              </button>
            </div>
          ) : null}
        </div>
        <div className='flex flex-1' style={{width: '50%'}}>
          {selectedItem ? (
            <div className='flex flex-col w-full overflow-auto'>
              <div className="flex items-center px-3 mb-4 font-medium">
                <span className='mr-2'>{selectedItem.relativePath}</span>
                <span>
                  {selectedItem.testStatus === 'pass' ? (
                    <IconCircleCheck className="test-success" size={20} strokeWidth={1.5}/>
                  ) : (
                    <IconCircleX className="test-failure" size={20} strokeWidth={1.5}/>
                  )}
                </span>
              </div>
              {/* <div className='px-3 mb-4 font-medium'>{selectedItem.relativePath}</div> */}
              <ResponsePane item={selectedItem} collection={collection}/>
            </div>
          ) : null}
        </div>
      </div>
    </StyledWrapper>
  );
};