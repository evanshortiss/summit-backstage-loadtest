# Delete all applications
oc get application -n janus-argocd | grep testuser | awk '{print $1}' | tail -n +2 | xargs oc delete application -n janus-argocd --wait=false

for NUMBER in {5..49}
do
  USER="testuser-$NUMBER"
  
  echo "Clean up user $USER"

  oc delete namespace $USER --wait=false
  
  WEBHOOKS=$(oc get gitwebhook -n $USER | tail -n +2 | awk '{print $1}')

  for HOOK in $WEBHOOKS
  do
    echo $HOOK
    oc delete gitwebhook $HOOK -n $USER --wait=false
    oc patch gitwebhook $HOOK -n $USER --type=json -p='[{"op": "remove", "path": "/metadata/finalizers"}]'
  done

  RANDOM_SECRETS=$(oc get randomsecret -n $USER | tail -n +2 | awk '{print $1}')

  for RS in $RANDOM_SECRETS
  do
    echo $RS
    oc delete randomsecret $RS -n $USER --wait=false
    oc patch randomsecret $RS -n $USER --type=json -p='[{"op": "remove", "path": "/metadata/finalizers"}]'
  done
done
